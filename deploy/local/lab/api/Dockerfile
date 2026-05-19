# syntax=docker/dockerfile:1
FROM python:3.12-alpine
WORKDIR /app
COPY api_server.py /app/api_server.py
EXPOSE 8081
CMD ["python", "/app/api_server.py"]
