from rest_framework.permissions import BasePermission


class IsRH(BasePermission):
    """Apenas usuários com role='rh'."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'rh')


class IsRHOrGestor(BasePermission):
    """Usuários com role='rh' ou role='gestor'."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('rh', 'gestor')
        )


class IsRHOrOwnerGestor(BasePermission):
    """RH pode tudo. Gestor só pode modificar objetos que ele criou."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('rh', 'gestor')
        )

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'rh':
            return True
        criado_por = getattr(obj, 'criado_por', None)
        return criado_por == request.user
