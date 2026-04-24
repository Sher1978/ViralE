
async function check() {
  const token = '8738398927:AAGzIEb_0cW73KC2LrzHz8qre4b4kgvAgMk';
  const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const d = await r.json();
  console.log(JSON.stringify(d, null, 2));
}
check();
