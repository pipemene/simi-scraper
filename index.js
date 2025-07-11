const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/consulta', async (req, res) => {
  try {
    // 👉 Recoge todos los filtros
    const { operacion = '1', tipo = '1', ciudad = '1', canon = '999999999' } = req.query;

    const url = 'https://simi-api.com/iframeNvo/index.php?inmo=901&typebox=1&numbox=3&viewtitlesearch=1&titlesearch=Buscador%20de%20Inmuebles&colortitlesearch=FFFFFF&bgtitlesearch=0076BD&secondct=0076BD&primaryc=0076BD&primaryct=ffff&token=xjJ36l4J6PjMucqp9khJq6gJCjfXxY8HthO0eQ6y';

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // 👉 Aplica filtros Simi: operación, tipo, ciudad
    await page.select('#tip_ope', operacion);
    await page.select('#tip_inm', tipo);
    await page.select('#ciudad', ciudad);

    await page.click('input[type="submit"].button');
    await page.waitForSelector('.item_property', { timeout: 10000 });

    // 👉 Filtra resultados por precio dentro del scraping
    const resultados = await page.evaluate((canonMax) => {
      const base = 'https://simi-api.com/iframeNvo/';
      const canonMaxNum = parseInt(canonMax);
      const items = [];

      document.querySelectorAll('.item_property').forEach(el => {
        const titulo = el.querySelector('h5')?.innerText.trim();
        const fondo = el.querySelector('.head_property')?.getAttribute('style');
        let imagen = null;
        if (fondo) {
          const match = fondo.match(/url\\(["']?(.*?)["']?\\)/);
          if (match && match[1]) imagen = match[1];
        }
        let link = el.querySelector('a')?.getAttribute('href');
        if (link) link = base + link;

        let precio = '';
        el.querySelectorAll('.info_property li').forEach(li => {
          if (li.innerText.includes('Precio')) {
            precio = li.querySelector('span')?.innerText.trim();
          }
        });

        if (titulo && imagen && link && precio) {
          const precioNum = parseInt(precio.replace(/[^0-9]/g, ''));
          if (precioNum <= canonMaxNum) {
            items.push({ titulo, imagen, precio, link });
          }
        }
      });
      return items;
    }, canon);

    await browser.close();
    res.json({ resultados });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en scraping Puppeteer.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor Puppeteer corriendo en puerto ${PORT}`);
});
