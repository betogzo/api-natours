/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB)
  .then(conn => console.log('DB connected'))
  .catch(error => console.log(error));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
