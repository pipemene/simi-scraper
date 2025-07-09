const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/consulta', async (req, res) => {
  try {
    const token = 'xjJ36l4J6PjMucqp9khJq6gJCjfXxY8HthO0eQ6y-901';

    const url = `https://simi-api.com/iframeNvo/index.php?inmo=901&typebox=1&numbox=3&viewtitlesearch=1&titlesearch=Buscador%20de%20Inmuebles&colortitlesearch=FFFFFF&bgtitlesearch=0076BD&secondct=0076BD&primaryc=0076BD&primaryct=ffff&token=${token}`;

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    let resultados = [];

    $('.item_property').each((i, el) => {
      const titulo = $(el).find('h5').text().trim();
      const fondo = $(el).find('.head_property').attr('style');
      let imagen = null;
      if (fondo) {
        const match = fondo.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) {
          imagen = match[1];
        }
      }

      const link = $(el).find('a').attr('href');

      let precio = '';
      $(el).find('.info_property li').each(function() {
        if ($(this).find('strong').text().includes('Precio')) {
          precio = $(this).find('span').text().trim();
        }
      });

      if (titulo && imagen && link && precio) {
        resultados.push({ titulo, imagen, precio, link });
      }
    });

    res.json({ resultados });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en scraping.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
