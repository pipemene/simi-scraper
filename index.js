const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/consulta', async (req, res) => {
  try {
    const { operacion = '1', tipo = '1', ciudad = '1', canon = '999999999' } = req.query;

    const url = 'https://simi-api.com/iframeNvo/index.php?inmo=901&typebox=1&numbox=3&viewtitlesearch=1&titlesearch=Buscador%20de%20Inmuebles&colortitlesearch=FFFFFF&bgtitlesearch=0076BD&secondct=0076BD&primaryc=0076BD&primaryct=ffff&token=xjJ36l4J6PjMucqp9khJq6gJCjfXxY8HthO0eQ6y';

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.select('#tip_ope', operacion);
    await page.select('#tip_inm', tipo);
    await page.select('#ciudad', ciudad);

    await page.click('input[type="submit"].button');
    await page.waitForSelector('.item_property', { timeout: 15000 });

    const base = 'https://simi-api.com/iframeNvo/';

    let resultados = await page.evaluate(() => {
      const base = 'https://simi-api.com/iframeNvo/';
      const items = [];
      document.querySelectorAll('.item_property').forEach(el => {
        const titulo = el.querySelector('h5')?.innerText.trim();
        const fondo = el.querySelector('.head_property')?.getAttribute('style');
        let imagen = null;
        if (fondo) {
          const match = fondo.match(/url\(["']?(.*?)["']?\)/);
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
          items.push({ titulo, imagen, precio, link });
        }
      });
      return items;
    });

    resultados = resultados.filter(r => {
      const precioNum = parseInt(r.precio.replace(/[^0-9]/g, ''));
      return precioNum <= parseInt(canon);
    });

    for (let r of resultados) {
      const detailPage = await browser.newPage();
      await detailPage.goto(r.link, { waitUntil: 'networkidle2' });

      const galeria = await detailPage.$$eval('img', imgs =>
        imgs.map(img => img.src).filter(src => src.includes('http')).slice(0,5)
      );

      const info = await detailPage.$$eval('li', lis => {
        let habitaciones = '';
        let banos = '';
        let direccion = '';
        lis.forEach(li => {
          const txt = li.innerText.toLowerCase();
          if (txt.includes('habitacion')) habitaciones = txt;
          if (txt.includes('baño') || txt.includes('bano')) banos = txt;
          if (txt.includes('dirección') || txt.includes('direccion')) direccion = txt;
        });
        return { habitaciones, banos, direccion };
      });

      const video = await detailPage.$eval('iframe', iframe => iframe.src, {timeout: 3000}).catch(() => '');

      r.galeria = galeria;
      r.habitaciones = info.habitaciones;
      r.banos = info.banos;
      r.direccion = info.direccion;
      r.video = video;

      await detailPage.close();
    }

    await browser.close();
    res.json({ resultados });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en scraping Puppeteer PRO.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor Puppeteer PRO corriendo en puerto ${PORT}`);
});
