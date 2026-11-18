from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, LogoutView, MeView, ChangePasswordView,
    UserViewSet, DepartmentViewSet, CargoViewSet,
)

router = DefaultRouter()
router.register(r'users',       UserViewSet,       basename='user')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'cargos',      CargoViewSet,      basename='cargo')

urlpatterns = [
    path('login/',           LoginView.as_view(),          name='token_obtain_pair'),
    path('logout/',          LogoutView.as_view(),          name='logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),   name='token_refresh'),
    path('me/',              MeView.as_view(),              name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('', include(router.urls)),
]
