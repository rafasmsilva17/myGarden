#!/usr/bin/env node
/**
 * Script de teste para notificações automáticas
 * Uso: node test-notifications.js
 */

const https = require('https');
const http = require('http');

// Configurar os dados de teste
const config = {
  // Local (desenvolvimento)
  localUrl: 'http://localhost:8888/.netlify/functions/check-notifications',
  
  // Produção (alterar com teu domínio)
  productionUrl: 'https://seu-dominio.netlify.app/.netlify/functions/check-notifications',
  
  // Usar local por padrão
  mode: process.argv[2] || 'local'
};

const url = config.mode === 'production' ? config.productionUrl : config.localUrl;

console.log(`🔔 Testando notificações automáticas...`);
console.log(`📍 URL: ${url}`);
console.log(`⏱️  Timestamp: ${new Date().toISOString()}\n`);

// Fazer request
const protocol = url.startsWith('https') ? https : http;
const urlObj = new URL(url);

const options = {
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 0
  }
};

if (urlObj.port) {
  options.port = urlObj.port;
}

const req = protocol.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`📦 Resposta:\n`);
    
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    if (res.statusCode === 200) {
      console.log(`\n✓ Teste bem-sucedido!`);
    } else {
      console.log(`\n✗ Erro: ${res.statusCode}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`\n✗ Erro de conexão:`, e.message);
  console.error(`Assegura-te que:`);
  console.error(`  - O servidor Netlify está a correr (npm run dev)`);
  console.error(`  - A URL está correcta: ${url}`);
});

req.end();
