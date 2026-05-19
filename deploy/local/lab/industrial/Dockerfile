# syntax=docker/dockerfile:1
FROM python:3.12-alpine
WORKDIR /app
COPY industrial_server.py /app/industrial_server.py
EXPOSE 4840
CMD ["python", "/app/industrial_server.py"]
