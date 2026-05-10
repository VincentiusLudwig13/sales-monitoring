const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
  const form = new FormData();
  form.append('name', 'Test Store');
  form.append('lat', '1.0');
  form.append('lon', '1.0');
  form.append('salesmanId', '12345');
  
  // mock photo
  fs.writeFileSync('test.jpg', 'fake image');
  form.append('photo', fs.createReadStream('test.jpg'), { filename: 'test.jpg', contentType: 'image/jpeg' });

  const res = await fetch('http://localhost:9000/stores', {
    method: 'POST',
    body: form,
  });

  console.log(res.status);
  console.log(await res.text());
}
run();
