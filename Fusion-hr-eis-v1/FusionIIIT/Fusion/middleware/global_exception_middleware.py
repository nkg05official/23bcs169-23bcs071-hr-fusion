import logging

from django.http import JsonResponse


logger = logging.getLogger(__name__)


class GlobalExceptionMiddleware:
    """Return uniform JSON error payload for uncaught exceptions."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        logger.exception("Unhandled exception", exc_info=exception)
        return JsonResponse(
            {
                "status": "error",
                "message": "Internal server error",
                "data": {},
                "error_code": "ERR_UNHANDLED_EXCEPTION",
            },
            status=500,
        )
