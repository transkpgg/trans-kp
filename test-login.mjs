async function test() {
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" })
  });
  console.log(res.status);
  const data = await res.json();
  console.log(data);
}
test();
