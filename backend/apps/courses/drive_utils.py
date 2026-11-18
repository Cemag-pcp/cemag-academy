"""
Google Drive sync utilities for CEMAG Academy.

Setup (two accepted formats):

Option A – individual env vars (recommended, paste from JSON key):
  GOOGLE_TYPE="service_account"
  GOOGLE_PROJECT_ID="…"
  GOOGLE_PRIVATE_KEY_ID="…"
  GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
  GOOGLE_CLIENT_EMAIL="…@….iam.gserviceaccount.com"
  GOOGLE_CLIENT_ID="…"
  GOOGLE_TOKEN_URI="https://oauth2.googleapis.com/token"

Option B – single JSON blob:
  GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account", …}'

Share the target Drive folder with the service account email (viewer or editor).
"""
import json
import os
from datetime import datetime

from django.utils import timezone

try:
    from decouple import config as env_config
except ImportError:
    def env_config(key, default=''):  # type: ignore
        return os.environ.get(key, default)


MIME_CATEGORY_MAP = {
    # Google Workspace
    'application/vnd.google-apps.video':          'video',
    'application/vnd.google-apps.document':       'doc',
    'application/vnd.google-apps.spreadsheet':    'sheet',
    'application/vnd.google-apps.presentation':   'slide',
    'application/vnd.google-apps.form':           'other',
    # Video
    'video/mp4': 'video', 'video/avi': 'video', 'video/mpeg': 'video',
    'video/quicktime': 'video', 'video/webm': 'video', 'video/x-msvideo': 'video',
    # PDF
    'application/pdf': 'pdf',
    # Images
    'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image',
    'image/webp': 'image', 'image/svg+xml': 'image',
    # Spreadsheets
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':   'sheet',
    'application/vnd.ms-excel': 'sheet',
    # Documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
    'application/msword': 'doc',
    # Presentations
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slide',
    'application/vnd.ms-powerpoint': 'slide',
}


def _clean(val: str) -> str:
    """Strip surrounding quotes and trailing commas left by JSON copy-paste."""
    val = val.strip()
    if val.endswith(','):
        val = val[:-1].strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in ('"', "'"):
        val = val[1:-1]
    return val


def _build_creds_info_from_env() -> dict | None:
    """
    Try to build a service-account credentials dict from individual GOOGLE_*
    environment variables (Option A).  Returns None if none are set.
    """
    env = {
        k: env_config(k, default='')
        for k in [
            'GOOGLE_TYPE', 'GOOGLE_PROJECT_ID', 'GOOGLE_PRIVATE_KEY_ID',
            'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_CLIENT_ID',
            'GOOGLE_AUTH_URI', 'GOOGLE_TOKEN_URI',
            'GOOGLE_AUTH_PROVIDER_X509_CERT_URL', 'GOOGLE_CLIENT_X509_CERT_URL',
        ]
    }
    if not env.get('GOOGLE_CLIENT_EMAIL'):
        return None

    private_key = _clean(env.get('GOOGLE_PRIVATE_KEY', ''))
    # Replace literal \n sequences that survive .env parsing
    private_key = private_key.replace('\\n', '\n')

    return {
        'type':                        _clean(env.get('GOOGLE_TYPE', 'service_account')),
        'project_id':                  _clean(env.get('GOOGLE_PROJECT_ID', '')),
        'private_key_id':              _clean(env.get('GOOGLE_PRIVATE_KEY_ID', '')),
        'private_key':                 private_key,
        'client_email':                _clean(env.get('GOOGLE_CLIENT_EMAIL', '')),
        'client_id':                   _clean(env.get('GOOGLE_CLIENT_ID', '')),
        'auth_uri':                    _clean(env.get('GOOGLE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth')),
        'token_uri':                   _clean(env.get('GOOGLE_TOKEN_URI', 'https://oauth2.googleapis.com/token')),
        'auth_provider_x509_cert_url': _clean(env.get('GOOGLE_AUTH_PROVIDER_X509_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs')),
        'client_x509_cert_url':        _clean(env.get('GOOGLE_CLIENT_X509_CERT_URL', '')),
    }


def _get_drive_service():
    """Build an authenticated Google Drive API service using a Service Account."""
    # Option A: individual GOOGLE_* vars
    creds_info = _build_creds_info_from_env()

    # Option B: single JSON blob
    if creds_info is None:
        sa_json = env_config('GOOGLE_SERVICE_ACCOUNT_JSON', default='').strip()
        if not sa_json:
            raise ValueError(
                'Google Drive não configurado. '
                'Defina as variáveis GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, etc. '
                'no arquivo .env, ou use GOOGLE_SERVICE_ACCOUNT_JSON com o JSON completo.'
            )
        creds_info = json.loads(sa_json)

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        raise ImportError(
            'Pacotes Google não instalados. '
            'Execute: pip install google-api-python-client google-auth google-auth-httplib2'
        )

    creds = service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=['https://www.googleapis.com/auth/drive.readonly'],
    )
    return build('drive', 'v3', credentials=creds, cache_discovery=False)


def _verify_folder_access(service, folder_id: str) -> dict:
    """
    Fetch folder metadata to verify the service account can access it.
    Raises a descriptive ValueError if not.
    """
    try:
        return service.files().get(
            fileId=folder_id,
            fields='id,name,mimeType',
            supportsAllDrives=True,
        ).execute()
    except Exception as exc:
        msg = str(exc)
        if '404' in msg or 'notFound' in msg.lower():
            raise ValueError(
                f'Pasta "{folder_id}" não encontrada. Verifique se o ID está correto e '
                f'se a pasta foi compartilhada com: drive-api@integration-355418.iam.gserviceaccount.com'
            )
        if '403' in msg or 'forbidden' in msg.lower() or 'permission' in msg.lower():
            raise ValueError(
                f'Sem permissão para acessar a pasta "{folder_id}". '
                f'Compartilhe a pasta com: drive-api@integration-355418.iam.gserviceaccount.com'
            )
        raise ValueError(f'Erro ao acessar o Google Drive: {msg}')


def _collect_subfolder_ids(service, folder_id: str) -> list[str]:
    """Return folder_id plus all subfolder IDs (BFS), so we can list files recursively."""
    all_ids = [folder_id]
    queue = [folder_id]
    while queue:
        parent = queue.pop(0)
        page_token = None
        while True:
            resp = service.files().list(
                q=f"'{parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields='nextPageToken,files(id)',
                pageSize=200,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            ).execute()
            for f in resp.get('files', []):
                all_ids.append(f['id'])
                queue.append(f['id'])
            page_token = resp.get('nextPageToken')
            if not page_token:
                break
    return all_ids


def _list_folder_files(service, folder_id: str, page_size: int = 500) -> list:
    """Return all (non-trashed, non-folder) files in folder_id and all subfolders."""
    # Collect this folder + all nested subfolders
    all_folder_ids = _collect_subfolder_ids(service, folder_id)

    results = []
    # Build a query for files (not folders) whose parent is any of the collected folders.
    # Drive API supports OR but has limits; batch in groups of 50.
    chunk_size = 50
    for i in range(0, len(all_folder_ids), chunk_size):
        chunk = all_folder_ids[i:i + chunk_size]
        parents_clause = ' or '.join(f"'{fid}' in parents" for fid in chunk)
        query = (
            f"({parents_clause}) "
            f"and mimeType != 'application/vnd.google-apps.folder' "
            f"and trashed=false"
        )
        page_token = None
        while True:
            resp = service.files().list(
                q=query,
                fields=(
                    'nextPageToken,'
                    'files(id,name,mimeType,webViewLink,thumbnailLink,size,modifiedTime)'
                ),
                orderBy='name',
                pageSize=min(page_size, 1000),
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            ).execute()
            results.extend(resp.get('files', []))
            page_token = resp.get('nextPageToken')
            if not page_token:
                break

    return results


GOOGLE_EXPORT_MIME = {
    'application/vnd.google-apps.document':     'application/pdf',
    'application/vnd.google-apps.spreadsheet':  'application/pdf',
    'application/vnd.google-apps.presentation': 'application/pdf',
    'application/vnd.google-apps.drawing':      'application/pdf',
}


def get_drive_file_bytes(drive_id: str, mime_type: str) -> tuple:
    """
    Download a Drive file via Service Account.
    Google Workspace docs (Docs, Sheets, Slides) are exported as PDF.
    Returns (content_bytes, effective_content_type).
    """
    import io
    from googleapiclient.http import MediaIoBaseDownload

    service = _get_drive_service()
    export_mime = GOOGLE_EXPORT_MIME.get(mime_type)

    if export_mime:
        req = service.files().export_media(fileId=drive_id, mimeType=export_mime)
        content_type = export_mime
    else:
        req = service.files().get_media(fileId=drive_id)
        content_type = mime_type

    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, req, chunksize=8 * 1024 * 1024)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    return buf.getvalue(), content_type


def sync_drive_folder(course, folder_id: str) -> list:
    """
    Sync files from a Google Drive folder into the course.
    Clears existing DriveFile records for the course and recreates them.
    Returns the list of created DriveFile instances.
    """
    from .models import DriveFile

    service = _get_drive_service()

    # Verify the folder is accessible before touching the DB
    _verify_folder_access(service, folder_id)

    raw_files = _list_folder_files(service, folder_id)

    # Persist
    course.drive_folder_id = folder_id
    course.drive_last_sync = timezone.now()
    course.save(update_fields=['drive_folder_id', 'drive_last_sync'])

    DriveFile.objects.filter(course=course).delete()

    drive_files = []
    for i, f in enumerate(raw_files):
        mime = f.get('mimeType', '')
        category = MIME_CATEGORY_MAP.get(mime, 'other')

        modified_at = None
        raw_mod = f.get('modifiedTime')
        if raw_mod:
            try:
                modified_at = datetime.fromisoformat(raw_mod.replace('Z', '+00:00'))
            except Exception:
                pass

        df = DriveFile.objects.create(
            course=course,
            drive_id=f['id'],
            name=f['name'],
            mime_type=mime,
            category=category,
            web_view_link=f.get('webViewLink', ''),
            thumbnail_link=f.get('thumbnailLink', ''),
            size=int(f['size']) if f.get('size') else None,
            modified_at=modified_at,
            order=i,
        )
        drive_files.append(df)

    return drive_files


def get_drive_file_info(drive_id: str) -> dict:
    """
    Retorna metadados de um arquivo do Drive pelo ID.
    Usado pelo módulo Acervo para pré-visualizar antes de salvar.
    """
    service = _get_drive_service()
    try:
        meta = service.files().get(
            fileId=drive_id,
            fields='id,name,mimeType,webViewLink,thumbnailLink,size',
            supportsAllDrives=True,
        ).execute()
    except Exception as exc:
        msg = str(exc)
        if '404' in msg or 'notFound' in msg.lower():
            raise ValueError(
                f'Arquivo "{drive_id}" não encontrado. Verifique o ID e se o arquivo '
                f'foi compartilhado com a conta de serviço.'
            )
        if '403' in msg or 'forbidden' in msg.lower() or 'permission' in msg.lower():
            raise ValueError(
                f'Sem permissão para acessar o arquivo "{drive_id}". '
                f'Compartilhe o arquivo com a conta de serviço do Google Drive.'
            )
        raise ValueError(f'Erro ao acessar o Google Drive: {msg}')

    return {
        'drive_id':            meta['id'],
        'drive_nome':          meta.get('name', ''),
        'drive_mime_type':     meta.get('mimeType', ''),
        'drive_web_view_link': meta.get('webViewLink', ''),
        'drive_thumbnail':     meta.get('thumbnailLink', ''),
        'size':                meta.get('size'),
    }
