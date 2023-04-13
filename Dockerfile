FROM denoland/deno:1.32.2

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .
RUN deno cache main.ts --import-map=import_map.json

EXPOSE 8080

CMD ["run", "-A", "main.ts", "--lock=deno.lock", "--lock-write"]