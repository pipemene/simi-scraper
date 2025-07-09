const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/consulta', async (req, res) => {
  try {
    const url = 'https://simi-api.com/iframeNvo/index.php?inmo=901&typebox=1&numbox=3&viewtitlesearch=1&titlesearch=Buscador%20de%20Inmuebles&colortitlesearch=FFFFFF&bgtitlesearch=0076BD&secondct=0076BD&primaryc=0076BD&primaryct=ffff&token=xjJ36l4J6PjMucqp9khJq6gJCjfXxY8HthO0eQ6y';

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.select('#tip_ope', '1'); // Arriendo
    await page.select('#tip_inm', '1'); // Apartamento
    await page.select('#ciudad', '1');  // Primera ciudad disponible

    await page.click('input[type="submit"].button');
    await page.waitForSelector('.item_property', { timeout: 10000 });

    const resultados = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.item_property').forEach(el => {
        const titulo = el.querySelector('h5')?.innerText.trim();
        const fondo = el.querySelector('.head_property')?.getAttribute('style');
        let imagen = null;
        if (fondo) {
          const match = fondo.match(/url\(["']?(.*?)["']?\)/);
          if (match && match[1]) {
            imagen = match[1];
          }
        }
        const link = el.querySelector('a')?.getAttribute('href');

        let precio = '';
        el.querySelectorAll('.info_property li').forEach(li => {
          if (li.innerText.includes('Precio')) {
            precio = li.querySelector('span')?.innerText.trim();
          }
        });

        if (titulo && imagen && link && precio) {
          items.push({ titulo, imagen, precio, link });
        }
      });
      return items;
    });

    await browser.close();
    res.json({ resultados });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en scraping Puppeteer con clicks.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor Puppeteer + Click corriendo en puerto ${PORT}`);
});
