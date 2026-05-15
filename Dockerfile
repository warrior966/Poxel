FROM ghcr.io/puppeteer/puppeteer:21.6.0

USER root

# Instalamos dependencias necesarias para Express
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de Render
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]
