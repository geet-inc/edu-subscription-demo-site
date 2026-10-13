// デモ用のマスターデータ（本番では DB / CMS から取得する想定）
// 英語専門の教材。subject は「分野」（フォニックス・単語・文法…）として使う
window.DEMO_DATA = (() => {
  const SUBJECTS = [
    { key: 'phonics', label: 'フォニックス', color: 'var(--cat-phonics)' },
    { key: 'vocab', label: '単語', color: 'var(--cat-vocab)' },
    { key: 'grammar', label: '文法', color: 'var(--cat-grammar)' },
    { key: 'listen', label: 'リスニング', color: 'var(--cat-listen)' },
    { key: 'speak', label: 'スピーキング', color: 'var(--cat-speak)' },
    { key: 'read', label: '読む・書く', color: 'var(--cat-read)' },
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
    { id: 'v01', grade: 'e1', subject: 'phonics', unit: 'アルファベット', title: 'ABCの歌で、アルファベットの音に親しもう', minutes: 6, free: true },
    { id: 'v02', grade: 'e1', subject: 'vocab', unit: '色と数', title: '色と数字を英語で言ってみよう', minutes: 7, free: false },
    { id: 'v03', grade: 'e2', subject: 'vocab', unit: '動物', title: '動物の名前を英語で覚えよう', minutes: 7, free: false },
    { id: 'v04', grade: 'e2', subject: 'phonics', unit: 'a・b・cの音', title: 'a・b・cの「音」を聞き分けよう', minutes: 8, free: false },
    { id: 'v05', grade: 'e3', subject: 'speak', unit: 'あいさつ', title: 'Hello! How are you? ― あいさつの表現', minutes: 8, free: true },
    { id: 'v06', grade: 'e3', subject: 'listen', unit: '曜日と天気', title: '曜日と天気の英語を聞き取ろう', minutes: 9, free: false },
    { id: 'v07', grade: 'e3', subject: 'phonics', unit: '大文字・小文字', title: 'アルファベットの大文字と小文字を書いてみよう', minutes: 9, free: false },
    { id: 'v08', grade: 'e4', subject: 'vocab', unit: '時刻', title: 'What time is it? ― 時刻の言い方', minutes: 10, free: false },
    { id: 'v09', grade: 'e4', subject: 'speak', unit: '好きなもの', title: 'I like 〜. で好きなものを伝えよう', minutes: 9, free: false },
    { id: 'v10', grade: 'e4', subject: 'phonics', unit: '短母音', title: 'a・i・u・e・o の短い音（短母音）', minutes: 10, free: false },
    { id: 'v25', grade: 'e4', subject: 'listen', unit: '道案内', title: 'Go straight. ― 道案内を聞き取ろう', minutes: 10, free: false },
    { id: 'v26', grade: 'e4', subject: 'vocab', unit: '文房具', title: 'Do you have a pen? ― 持ち物をたずねよう', minutes: 9, free: false },
    { id: 'v27', grade: 'e4', subject: 'read', unit: '3文字の単語', title: 'フォニックスで3文字の単語を読んでみよう', minutes: 11, free: false },
    { id: 'v28', grade: 'e4', subject: 'grammar', unit: 'Do you 〜?', title: 'Do you 〜? のたずね方と答え方', minutes: 10, free: false },
    { id: 'v11', grade: 'e5', subject: 'speak', unit: '自己紹介', title: "I'm from 〜. ― 英語で自己紹介をしよう", minutes: 10, free: true },
    { id: 'v12', grade: 'e5', subject: 'grammar', unit: 'can', title: 'I can 〜. で、できることを伝えよう', minutes: 11, free: false },
    { id: 'v13', grade: 'e5', subject: 'listen', unit: '月と日付', title: 'When is your birthday? ― 月と日付の聞き取り', minutes: 10, free: false },
    { id: 'v14', grade: 'e6', subject: 'speak', unit: '過去の出来事', title: 'I went to 〜. ― 夏休みの思い出を話そう', minutes: 12, free: false },
    { id: 'v15', grade: 'e6', subject: 'read', unit: '短い英文', title: '短い英文を読んで、内容をつかもう', minutes: 12, free: false },
    { id: 'v16', grade: 'e6', subject: 'grammar', unit: '将来の夢', title: 'I want to be 〜. ― 将来の夢を伝えよう', minutes: 11, free: false },
    { id: 'v17', grade: 'j1', subject: 'grammar', unit: 'be動詞', title: 'be動詞と一般動詞の違いをはっきりさせる', minutes: 16, free: true },
    { id: 'v18', grade: 'j1', subject: 'grammar', unit: '三単現', title: '三人称単数現在の s をマスターしよう', minutes: 15, free: false },
    { id: 'v19', grade: 'j1', subject: 'listen', unit: '日常会話', title: '学校生活と日常会話のリスニング', minutes: 14, free: false },
    { id: 'v29', grade: 'j1', subject: 'vocab', unit: '中1必須単語', title: '中1で覚えたい必須英単語100', minutes: 18, free: false },
    { id: 'v30', grade: 'j1', subject: 'read', unit: '英作文入門', title: '自分のことを英語で3文書いてみよう', minutes: 14, free: false },
    { id: 'v31', grade: 'j1', subject: 'phonics', unit: 'th・r・l', title: '日本人が苦手な th・r・l の発音', minutes: 12, free: false },
    { id: 'v20', grade: 'j2', subject: 'grammar', unit: '不定詞', title: '不定詞の3つの用法を例文で覚える', minutes: 18, free: false },
    { id: 'v21', grade: 'j2', subject: 'grammar', unit: '比較', title: '比較級・最上級の作り方と使い方', minutes: 17, free: false },
    { id: 'v22', grade: 'j2', subject: 'speak', unit: '買い物の会話', title: 'How much is it? ― 買い物の会話表現', minutes: 14, free: false },
    { id: 'v23', grade: 'j3', subject: 'grammar', unit: '現在完了', title: '現在完了の「継続・経験・完了」', minutes: 20, free: false },
    { id: 'v24', grade: 'j3', subject: 'read', unit: '長文読解', title: '高校入試の長文読解 ― 段落ごとに要点をつかむ', minutes: 22, free: false },
  ].map((v, i) => ({
    ...v,
    vimeoId: V[i % V.length],
    description: `「${v.unit}」の単元を、音声とイラストを使ってていねいに解説します。動画のあとにワークシートで書いて、声に出して練習すると、しっかり身につきます。`,
    worksheet: true,
  }));

  const PLANS = [
    { key: 'monthly', label: '月額プラン', price: 1980, unit: '月', note: 'いつでも解約できます' },
    { key: 'yearly', label: '年額プラン', price: 19800, unit: '年', note: '月額より2か月分おトク', recommended: true },
  ];

  return { SUBJECTS, GRADES, VIDEOS, PLANS, TRIAL_DAYS: 7, MAX_CHILDREN: 3 };
})();
