const express = require('express');

const app = new express();

app.use(express.json());

app.get('/', (req, res) => {
	res.status(200).send("Hii there!");
})

app.listen(3000);
