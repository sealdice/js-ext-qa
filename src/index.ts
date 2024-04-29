import MiniSearch from 'minisearch';
import data from './data.json';

type Results = {
  id: string;
  title: string;
  score: number;
  titles: string[];
};

async function update() {
  let v = await fetch(
    'https://github.com/sealdice/sealdice-manual-next/tree-commit-info/gh-pages/assets/chunks',
    {
      headers: { accept: 'application/json' },
      body: null,
      method: 'GET',
    }
  ).then((v) => v.json());

  let file = Object.keys(v).filter((v) =>
    v.startsWith('@localSearchIndexroot')
  )[0];
  let url = `https://github.com/sealdice/sealdice-manual-next/raw/gh-pages/assets/chunks/${file}`;
  let text = await fetch(url, {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    },
    body: null,
    method: 'GET',
  }).then((v) => v.text());
  text = text.replace("const t='", '');
  text = text.replace("';export{t as default};", '');
  return MiniSearch.loadJSON(text, {
    fields: ['title', 'titles', 'text'],
    storeFields: ['title', 'titles'],
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
      boost: { title: 4, text: 2, titles: 1 },
    },
  });
}

const doc_url = 'https://docs.sealdice.com/';

let ext = seal.ext.find('qa');
if (!ext) {
  ext = seal.ext.new('qa', 'nao', '0.0.0');
  seal.ext.register(ext);
}

let _minisearch = new MiniSearch({
  fields: ['title', 'titles', 'text'],
  storeFields: ['title', 'titles'],
});

console.log('载入文档中……');
// 即使不能立刻访问到 github 也能用……
_minisearch = MiniSearch.loadJS(data, {
  fields: ['title', 'titles', 'text'],
  storeFields: ['title', 'titles'],
  searchOptions: {
    fuzzy: 0.2,
    prefix: true,
    boost: { title: 4, text: 2, titles: 1 },
  },
});
console.log('载入文档完成');

const qa = seal.ext.newCmdItemInfo();
qa.name = 'qa';
qa.help = 'qa keyword // 搜索手册';
qa.solve = (ctx, msg, cmdArgs) => {
  let keyword = cmdArgs.getArgN(1);
  let r = seal.ext.newCmdExecuteResult(true);
  if (keyword == '') {
    r.showHelp = true;
    return r;
  }
  if (keyword == 'update') {
    seal.replyToSender(ctx, msg, '尝试更新索引，但结果取决于网络');
    update().then((v) => (_minisearch = v));
    return r;
  }
  let res = _minisearch.search(keyword) as unknown as Results[];
  res = res.slice(0, 3);
  if (res.length == 0) {
    seal.replyToSender(ctx, msg, '搜索失败');
    return r;
  }
  let text = '';
  res.forEach((v) => {
    text += `[Score:${Math.ceil(v.score)}] ${v.title} \n`;
    let url = encodeURI(v.id.replace('/sealdice-manual-next/', doc_url));
    text += url + '\n';
  });
  seal.replyToSender(ctx, msg, text);
  return r;
};

ext.cmdMap['qa'] = qa;
