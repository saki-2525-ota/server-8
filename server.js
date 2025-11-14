import { Hono } from 'jsr:@hono/hono';
import { serveStatic } from 'jsr:@hono/hono/deno';
const app = new Hono();

app.use('/*', serveStatic({ root: './public' }));

// データベースの準備
const kv = await Deno.openKv();

/***  リソースの作成 ***/
app.post('/api/pokemons', async (c) => {
  const body = await c.req.parseBody();
  const record = JSON.parse(body.record);

  const id = await getNextId();
  record['id'] = id;
  record['createdAt'] = new Date().toISOString();

  await kv.set(['pokemons', id], record);

  c.statud(201);
  c.header('Location', `/api/pokemons/${id}`);

  return c.json({ record });
});

/*** リソースの取得（レコード単体） ***/
app.get('/api/pokemons/:id', async (c) => {
  const id = Number(c.req.param('id'));

  const pkmn = await kv.get(['pokemons', id]);
  if (pkmn.value) {
    return c.json(pkmn.value);
  } else {
    c.status(404);
    return c.json({ message: 'IDが${ID}のポケモンはいませんでした。 ' });
  }
});

/*** リソースの取得（コレクション） ***/
app.get('/api/pokemons', async (c) => {
  const pkmns = await kv.list({ prefix: ['pokemons'] });

  const pkmnList = await Array.fromAsync(pkmns);
  if (pkmnList.length > 0) {
    return c.json(pkmnList.map((e) => e.value));
  } else {
    c.status(404);
    return c.json({ message: 'pokemonコレクションのデータは一つもありませんでした。' });
  }

  return c.json({ path: c.req.path });
});

/*** リソースの更新 ***/
app.put('/api/pokemons/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id) || !Number.isInterger(id)) {
    c.status(400);
    return c.json({ message: '更新したいポケモンのIDを正しく指定してください。' });
  }
  const pkmns = await kv.list({ prefix: ['pokemons'] });
  let exeisted = false;
  for await (const pkmn of pkmns) {
    if (pkmn.value.id == id) {
      exeisted = true;
      break;
    }
  }
  return c.json({ path: c.req.path });
});

/*** リソースの削除 ***/
app.delete('/api/pokemons/:id', async (c) => {
  return c.json({ path: c.req.path });
});

/*** リソースをすべて削除（練習用） ***/
app.delete('/api/pokemons', async (c) => {
  return c.json({ path: c.req.path });
});

Deno.serve(app.fetch);
