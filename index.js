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
    const { tipo, ciudad, precio, operacion } = req.query;

    const token = 'xjJ36l4J6PjMucqp9khJq6gJCjfXxY8HthO0eQ6y-901';

    const url = `https://simi-api.com/iframeNvo/index.php?inmo=901&typebox=1&numbox=3&viewtitlesearch=1&titlesearch=Buscador%20de%20Inmuebles&colortitlesearch=FFFFFF&bgtitlesearch=0076BD&secondct=0076BD&primaryc=0076BD&primaryct=ffff&token=${token}`;

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    let resultados = [];

    $('.contenedorinmueble').each((i, el) => {
      const titulo = $(el).find('.titulo').text().trim();
      const imagen = $(el).find('img').attr('src');
      const precioItem = $(el).find('.precio').text().trim();
      const link = $(el).find('a').attr('href');

      resultados.push({ titulo, imagen, precio: precioItem, link });
    });

    res.json({ resultados });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al scrapear.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
