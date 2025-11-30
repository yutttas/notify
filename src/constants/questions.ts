import { Question } from '@/types'

export const QUESTIONS: Question[] = [
  // 【価値観・ビジョン（方向性の一致）】10点
  {
    id: 'q1',
    order: 1,
    text: '夫婦のお金の使い方や管理ルールに納得している。',
    category: 'vision',
  },
  {
    id: 'q2',
    order: 2,
    text: '二人の将来について、必要な時にちゃんと話し合えている。',
    category: 'vision',
  },
  // 【カテゴリ2：運営・役割分担】15点
  {
    id: 'q3',
    order: 3,
    text: '自分の家事負担について納得している。',
    category: 'operation',
  },
  {
    id: 'q4',
    order: 4,
    text: 'パートナーとの時間以外も大切にできている。',
    category: 'operation',
  },
  {
    id: 'q5',
    order: 5,
    text: '夫婦時間と夫婦以外の時間のバランスは適切か。',
    category: 'operation',
  },
  // 【カテゴリ3：対話・心理的安全性】10点
  {
    id: 'q6',
    order: 6,
    text: 'パートナーとの会話やコミュニケーションは十分だと感じる。',
    category: 'communication',
  },
  {
    id: 'q7',
    order: 7,
    text: '家では気を遣わず、ありのままの自分でいられる。',
    category: 'communication',
  },
  // 【カテゴリ4：信頼・パートナーシップ】10点
  {
    id: 'q8',
    order: 8,
    text: 'お互いを尊重しあえている関係性を築けているか。',
    category: 'trust',
  },
  {
    id: 'q9',
    order: 9,
    text: 'パートナーとは、今も恋人のような良い関係でいられている。',
    category: 'trust',
  },
  // 【総合：自己評価】5点（結果には表示しない）
  {
    id: 'q10',
    order: 10,
    text: '私は、仕事と家庭を上手く両立できていると思う。',
    category: 'self_assessment',
  },
]

export const SCORE_OPTIONS = [
  { value: 5, label: '納得している' },
  { value: 4, label: 'やや納得している' },
  { value: 3, label: '普通' },
  { value: 2, label: 'やや不満を感じている' },
  { value: 1, label: '不満を感じている' },
]
