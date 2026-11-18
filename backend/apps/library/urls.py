from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LibraryItemViewSet

router = DefaultRouter()
router.register(r'', LibraryItemViewSet, basename='library')

urlpatterns = [
    path('', include(router.urls)),
]
