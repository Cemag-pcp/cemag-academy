from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseProgressViewSet

router = DefaultRouter()
router.register(r'', CourseProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
]
