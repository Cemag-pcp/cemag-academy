from django.urls import path
from .views import DashboardRHView, DashboardGestorView, DashboardColaboradorView
from .relatorios import RelatorioColaboradoresView, RelatorioTrilhasView

urlpatterns = [
    path('relatorios/colaboradores/', RelatorioColaboradoresView.as_view(), name='relatorio-colaboradores'),
    path('relatorios/trilhas/',       RelatorioTrilhasView.as_view(),       name='relatorio-trilhas'),
    path('rh/',          DashboardRHView.as_view(),          name='dashboard-rh'),
    path('gestor/',      DashboardGestorView.as_view(),      name='dashboard-gestor'),
    path('colaborador/', DashboardColaboradorView.as_view(), name='dashboard-colaborador'),
]
