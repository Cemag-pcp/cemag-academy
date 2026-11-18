import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

print("=== NOTIFICAÇÕES CRIADAS ===")
cursor.execute("""
    SELECT n.id, n.tipo, n.titulo, n.mensagem, n.lida, n.criada_em, 
           u.nome as destinatario_nome
    FROM notifications_notification n
    JOIN accounts_user u ON n.destinatario_id = u.id
    ORDER BY n.criada_em DESC
    LIMIT 10
""")

notificacoes = cursor.fetchall()
for notif in notificacoes:
    print(f"\nID: {notif[0]}")
    print(f"Tipo: {notif[1]}")
    print(f"Título: {notif[2]}")
    print(f"Mensagem: {notif[3]}")
    print(f"Lida: {notif[4]}")
    print(f"Criada em: {notif[5]}")
    print(f"Destinatário: {notif[6]}")
    print("-" * 50)

print(f"\nTotal: {len(notificacoes)} notificações")

conn.close()
