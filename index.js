const express = require('express');
require('dotenv').config()

const app = express();

app.use(express.static("./static"))

app.listen(port=process.env.PORT, () => {
  console.log(`Server listening on ${process.env.HOST}:${process.env.PORT}`);
});
