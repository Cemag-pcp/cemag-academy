from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, DiscussionViewSet, AssessmentViewSet

# Router principal para cursos (acessa /api/v1/courses/)
course_router = DefaultRouter()
course_router.register(r'', CourseViewSet, basename='course')

# Routers separados
discussion_router = DefaultRouter()
discussion_router.register(r'', DiscussionViewSet, basename='discussion')

assessment_router = DefaultRouter()
assessment_router.register(r'', AssessmentViewSet, basename='assessment')

urlpatterns = [
    path('discussions/', include(discussion_router.urls)),
    path('assessments/', include(assessment_router.urls)),
    path('', include(course_router.urls)),  # Deve ficar por último
]
