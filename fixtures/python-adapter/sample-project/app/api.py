def create_app():
    return {"status": "ok"}


class ApiFacade:
    def get_health(self):
        return create_app()

