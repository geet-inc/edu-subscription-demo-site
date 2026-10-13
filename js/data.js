// デモ用のマスターデータ（本番では DB / CMS から取得する想定）
window.DEMO_DATA = (() => {
  const SUBJECTS = [
    { key: 'jp', label: '国語', color: 'var(--subj-jp)' },
    { key: 'math', label: '算数・数学', color: 'var(--subj-math)' },
    { key: 'sci', label: '理科', color: 'var(--subj-sci)' },
    { key: 'soc', label: '社会', color: 'var(--subj-soc)' },
    { key: 'en', label: '英語', color: 'var(--subj-en)' },
  ];

  const GRADES = [
    { key: 'e1', label: '小1', stage: '小学生' },
    { key: 'e2', label: '小2', stage: '小学生' },
    { key: 'e3', label: '小3', stage: '小学生' },
    { key: 'e4', label: '小4', stage: '小学生' },
    { key: 'e5', label: '小5', stage: '小学生' },
    { key: 'e6', label: '小6', stage: '小学生' },
    { key: 'j1', label: '中1', stage: '中学生' },
    { key: 'j2', label: '中2', stage: '中学生' },
    { key: 'j3', label: '中3', stage: '中学生' },
  ];

  // Vimeo の公開サンプル動画 ID（本番では先方の Vimeo アカウントの非公開動画 ID に差し替え）
  const V = ['22439234', '1084537'];

  const VIDEOS = [
    { id: 'v01', grade: 'e1', subject: 'jp', unit: 'ひらがな', title: 'ひらがなの「あ」〜「お」を書いてみよう', minutes: 8, free: true },
    { id: 'v02', grade: 'e1', subject: 'math', unit: 'かずとすうじ', title: '10までのかずをかぞえよう', minutes: 7, free: false },
    { id: 'v03', grade: 'e2', subject: 'math', unit: 'かけ算', title: 'かけ算九九の考え方（2の段・5の段）', minutes: 12, free: false },
    { id: 'v04', grade: 'e2', subject: 'jp', unit: '漢字', title: '2年生で習う漢字 ― 部首から覚えるコツ', minutes: 10, free: false },
    { id: 'v05', grade: 'e3', subject: 'sci', unit: 'こん虫', title: 'こん虫の体のつくりを観察しよう', minutes: 11, free: true },
    { id: 'v06', grade: 'e3', subject: 'soc', unit: '地図の見方', title: '地図記号を覚えて、まちを探検しよう', minutes: 9, free: false },
    { id: 'v07', grade: 'e3', subject: 'math', unit: 'わり算', title: 'わり算ってなに？ ― 同じ数ずつ分ける', minutes: 13, free: false },
    { id: 'v08', grade: 'e4', subject: 'math', unit: '小数', title: '小数のしくみと、たし算・ひき算', minutes: 14, free: false },
    { id: 'v09', grade: 'e4', subject: 'sci', unit: '電気のはたらき', title: '乾電池のつなぎ方で明るさはどう変わる？', minutes: 12, free: false },
    { id: 'v10', grade: 'e4', subject: 'soc', unit: '都道府県', title: '47都道府県を地方ごとに覚えよう', minutes: 15, free: false },
    { id: 'v25', grade: 'e4', subject: 'jp', unit: '慣用句', title: '「足を洗う」ってどんな意味？ 慣用句を楽しく覚える', minutes: 9, free: false },
    { id: 'v26', grade: 'e4', subject: 'math', unit: '面積', title: '長方形と正方形の面積の求め方', minutes: 12, free: false },
    { id: 'v27', grade: 'e4', subject: 'sci', unit: '月と星', title: '月の形と動きを観察しよう', minutes: 11, free: false },
    { id: 'v28', grade: 'e4', subject: 'math', unit: '折れ線グラフ', title: '折れ線グラフの読み方とかき方', minutes: 10, free: false },
    { id: 'v11', grade: 'e5', subject: 'math', unit: '割合', title: '割合・百分率をイメージでつかむ', minutes: 16, free: true },
    { id: 'v12', grade: 'e5', subject: 'jp', unit: '敬語', title: '尊敬語・謙譲語・丁寧語の使い分け', minutes: 11, free: false },
    { id: 'v13', grade: 'e5', subject: 'en', unit: '自己紹介', title: 'I like 〜. で自分のことを話そう', minutes: 9, free: false },
    { id: 'v14', grade: 'e6', subject: 'soc', unit: '歴史', title: '縄文時代と弥生時代のくらしをくらべる', minutes: 14, free: false },
    { id: 'v15', grade: 'e6', subject: 'math', unit: '比', title: '比の考え方と、比を使った問題', minutes: 15, free: false },
    { id: 'v16', grade: 'e6', subject: 'sci', unit: '水溶液', title: '酸性・中性・アルカリ性を見分ける', minutes: 13, free: false },
    { id: 'v17', grade: 'j1', subject: 'math', unit: '正負の数', title: 'マイナスの数のかけ算はなぜプラスになる？', minutes: 18, free: true },
    { id: 'v18', grade: 'j1', subject: 'en', unit: 'be動詞', title: 'be動詞と一般動詞の違いをはっきりさせる', minutes: 16, free: false },
    { id: 'v19', grade: 'j1', subject: 'sci', unit: '植物の分類', title: '種子植物の分類を図で整理しよう', minutes: 17, free: false },
    { id: 'v29', grade: 'j1', subject: 'math', unit: '文字式', title: '文字を使った式のきまり', minutes: 15, free: false },
    { id: 'v30', grade: 'j1', subject: 'jp', unit: '文法', title: '文節と単語の区切り方', minutes: 13, free: false },
    { id: 'v31', grade: 'j1', subject: 'soc', unit: '世界の地理', title: '六大陸と三大洋を地図でつかむ', minutes: 14, free: false },
    { id: 'v20', grade: 'j2', subject: 'math', unit: '連立方程式', title: '連立方程式 ― 加減法と代入法', minutes: 20, free: false },
    { id: 'v21', grade: 'j2', subject: 'en', unit: '不定詞', title: '不定詞の3つの用法を例文で覚える', minutes: 18, free: false },
    { id: 'v22', grade: 'j2', subject: 'jp', unit: '古文', title: '枕草子で学ぶ古文の読み方入門', minutes: 19, free: false },
    { id: 'v23', grade: 'j3', subject: 'math', unit: '二次方程式', title: '二次方程式と解の公式', minutes: 22, free: false },
    { id: 'v24', grade: 'j3', subject: 'soc', unit: '公民', title: '三権分立のしくみを図で理解する', minutes: 17, free: false },
  ].map((v, i) => ({
    ...v,
    vimeoId: V[i % V.length],
    description: `${v.unit}の単元を、黒板とイラストを使ってていねいに解説します。動画を見たあとにワークシートで練習すると、理解が定着します。`,
    worksheet: true,
  }));

  const PLANS = [
    { key: 'monthly', label: '月額プラン', price: 1980, unit: '月', note: 'いつでも解約できます' },
    { key: 'yearly', label: '年額プラン', price: 19800, unit: '年', note: '月額より2か月分おトク', recommended: true },
  ];

  return { SUBJECTS, GRADES, VIDEOS, PLANS, TRIAL_DAYS: 7, MAX_CHILDREN: 3 };
})();
