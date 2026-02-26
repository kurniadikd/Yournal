// @ts-ignore
import five_whys from '../assets/templates/5_whys.html?raw';
// @ts-ignore
import body_scan from '../assets/templates/body_scan.html?raw';
// @ts-ignore
import brain_dump from '../assets/templates/brain_dump.html?raw';
// @ts-ignore
import cbt_thought_record from '../assets/templates/cbt_thought_record.html?raw';
// @ts-ignore
import cornell_notes from '../assets/templates/cornell_notes.html?raw';
// @ts-ignore
import daily_checkin from '../assets/templates/daily_checkin.html?raw';
// @ts-ignore
import dream_log from '../assets/templates/dream_log.html?raw';
// @ts-ignore
import eisenhower from '../assets/templates/eisenhower.html?raw';
// @ts-ignore
import gratitude from '../assets/templates/gratitude.html?raw';
// @ts-ignore
import habit_loop from '../assets/templates/habit_loop.html?raw';
// @ts-ignore
import nvc_reflection from '../assets/templates/nvc_reflection.html?raw';
// @ts-ignore
import pattern_analysis from '../assets/templates/pattern_analysis.html?raw';
// @ts-ignore
import pomodoro_log from '../assets/templates/pomodoro_log.html?raw';
// @ts-ignore
import pro_cons from '../assets/templates/pro_cons.html?raw';
// @ts-ignore
import radical_acceptance from '../assets/templates/radical_acceptance.html?raw';
// @ts-ignore
import rule_101010 from '../assets/templates/rule_101010.html?raw';
// @ts-ignore
import scamper from '../assets/templates/scamper.html?raw';
// @ts-ignore
import self_compassion from '../assets/templates/self_compassion.html?raw';
// @ts-ignore
import session_log from '../assets/templates/session_log.html?raw';
// @ts-ignore
import smart_goals from '../assets/templates/smart_goals.html?raw';
// @ts-ignore
import stop_technique from '../assets/templates/stop_technique.html?raw';
// @ts-ignore
import success_journal from '../assets/templates/success_journal.html?raw';
// @ts-ignore
import swot from '../assets/templates/swot.html?raw';
// @ts-ignore
import three_good_things from '../assets/templates/three_good_things.html?raw';
// @ts-ignore
import trigger_identification from '../assets/templates/trigger_identification.html?raw';
// @ts-ignore
import unsent_letter from '../assets/templates/unsent_letter.html?raw';
// @ts-ignore
import value_alignment from '../assets/templates/value_alignment.html?raw';
// @ts-ignore
import weekly_review from '../assets/templates/weekly_review.html?raw';
// @ts-ignore
import worry_time from '../assets/templates/worry_time.html?raw';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  content: string;
}

export const NOTE_TEMPLATES: TemplateInfo[] = [
  {
    id: '5_whys',
    name: '5 Whys / Akar Masalah',
    description: 'Tanya \'Kenapa\' 5x untuk solusi',
    icon: 'help_center',
    category: 'Analisis & Pemecahan Masalah',
    content: five_whys
  },
  {
    id: 'body_scan',
    name: 'Body Scan & Emotion',
    description: 'Sadari letak emosi di tubuh',
    icon: 'accessibility_new',
    category: 'Regulasi Emosi',
    content: body_scan
  },
  {
    id: 'brain_dump',
    name: 'Brain Dump',
    description: 'Tulis bebas untuk lepas beban mental',
    icon: 'delete_sweep',
    category: 'Refleksi & Hubungan',
    content: brain_dump
  },
  {
    id: 'cbt_thought_record',
    name: 'Rekam Pikiran (CBT)',
    description: 'Identifikasi & tantang pikiran negatif',
    icon: 'psychology',
    category: 'Regulasi Emosi',
    content: cbt_thought_record
  },
  {
    id: 'cornell_notes',
    name: 'Cornell Notes',
    description: 'Catatan studi terstruktur & efektif',
    icon: 'school',
    category: 'Analisis & Pemecahan Masalah',
    content: cornell_notes
  },
  {
    id: 'daily_checkin',
    name: 'Cek Harian',
    description: 'Mindfulness & kondisi emosi',
    icon: 'person_check',
    category: 'Dasar & Keseharian',
    content: daily_checkin
  },
  {
    id: 'dream_log',
    name: 'Jurnal Mimpi',
    description: 'Mencatat pesan bawah sadar',
    icon: 'cloud_moon',
    category: 'Refleksi & Hubungan',
    content: dream_log
  },
  {
    id: 'eisenhower',
    name: 'Eisenhower Matrix',
    description: 'Prioritas tugas berdasarkan urgensi',
    icon: 'grid_view',
    category: 'Fokus & Perencanaan',
    content: eisenhower
  },
  {
    id: 'gratitude',
    name: 'Gratitude Journal',
    description: 'Jurnal Syukur: Fokus hal positif harian',
    icon: 'volunteer_activism',
    category: 'Dasar & Keseharian',
    content: gratitude
  },
  {
    id: 'habit_loop',
    name: 'Analisis Kebiasaan',
    description: 'Membedah pola perilaku',
    icon: 'loop',
    category: 'Refleksi & Hubungan',
    content: habit_loop
  },
  {
    id: 'nvc_reflection',
    name: 'Refleksi NVC',
    description: 'Bedah konflik hubungan dengan Komunikasi Tanpa Kekerasan',
    icon: 'forum',
    category: 'Refleksi & Hubungan',
    content: nvc_reflection
  },
  {
    id: 'pattern_analysis',
    name: 'Analisis Pola Mingguan',
    description: 'Hubungan mood, tidur, & energi',
    icon: 'timeline',
    category: 'Fokus & Perencanaan',
    content: pattern_analysis
  },
  {
    id: 'pomodoro_log',
    name: 'Pomodoro Log',
    description: 'Lacak sesi fokus & istirahat',
    icon: 'timer',
    category: 'Fokus & Perencanaan',
    content: pomodoro_log
  },
  {
    id: 'pro_cons',
    name: 'Pro & Cons List',
    description: 'Bandingkan keuntungan & kerugian',
    icon: 'thumbs_up_down',
    category: 'Analisis & Pemecahan Masalah',
    content: pro_cons
  },
  {
    id: 'radical_acceptance',
    name: 'Penerimaan Radikal',
    description: 'DBT: Terima proses kenyataan yang menyakitkan',
    icon: 'psychiatry',
    category: 'Regulasi Emosi',
    content: radical_acceptance
  },
  {
    id: 'rule_101010',
    name: 'Rule 10-10-10',
    description: 'Dampak dalam 10 menit, bulan, tahun',
    icon: 'schedule',
    category: 'Analisis & Pemecahan Masalah',
    content: rule_101010
  },
  {
    id: 'scamper',
    name: 'SCAMPER / Ideasi',
    description: 'Teknik brainstorming kreatif',
    icon: 'lightbulb',
    category: 'Analisis & Pemecahan Masalah',
    content: scamper
  },
  {
    id: 'self_compassion',
    name: 'Surat Welas Asih',
    description: 'Berdamai dengan diri sendiri',
    icon: 'favorite',
    category: 'Refleksi & Hubungan',
    content: self_compassion
  },
  {
    id: 'session_log',
    name: 'Log Sesi',
    description: 'Rekap sesi kerja atau belajar',
    icon: 'assignment',
    category: 'Fokus & Perencanaan',
    content: session_log
  },
  {
    id: 'smart_goals',
    name: 'SMART Goals',
    description: 'Tujuan Spesifik, Terukur, & Realistis',
    icon: 'flag',
    category: 'Fokus & Perencanaan',
    content: smart_goals
  },
  {
    id: 'stop_technique',
    name: 'Teknik STOP',
    description: 'Stop, Take breath, Observe, Proceed',
    icon: 'pan_tool',
    category: 'Regulasi Emosi',
    content: stop_technique
  },
  {
    id: 'success_journal',
    name: 'Success Journal',
    description: 'Catat kemenangan kecil & besar',
    icon: 'emoji_events',
    category: 'Dasar & Keseharian',
    content: success_journal
  },
  {
    id: 'swot',
    name: 'Analisis SWOT',
    description: 'Strengths, Weaknesses, Opportunities, Threats',
    icon: 'target',
    category: 'Analisis & Pemecahan Masalah',
    content: swot
  },
  {
    id: 'three_good_things',
    name: 'Three Good Things',
    description: '3 kejadian baik & alasannya',
    icon: 'thumb_up',
    category: 'Dasar & Keseharian',
    content: three_good_things
  },
  {
    id: 'trigger_identification',
    name: 'Identifikasi Pemicu',
    description: 'Pahami pola emosi & trigger-nya',
    icon: 'warning',
    category: 'Regulasi Emosi',
    content: trigger_identification
  },
  {
    id: 'unsent_letter',
    name: 'Surat Tak Terkirim',
    description: 'Proses emosi ke orang lain/masa lalu',
    icon: 'mail',
    category: 'Refleksi & Hubungan',
    content: unsent_letter
  },
  {
    id: 'value_alignment',
    name: 'Value-Action Alignment',
    description: 'Cek keselarasan tindakan & nilai diri',
    icon: 'balance',
    category: 'Refleksi & Hubungan',
    content: value_alignment
  },
  {
    id: 'weekly_review',
    name: 'Weekly Review',
    description: 'Evaluasi mingguan & rencana depan',
    icon: 'next_week',
    category: 'Fokus & Perencanaan',
    content: weekly_review
  },
  {
    id: 'worry_time',
    name: 'Kotak Kecemasan (Worry Time)',
    description: 'Tunda & kelola cemas di waktu khusus',
    icon: 'inventory_2',
    category: 'Regulasi Emosi',
    content: worry_time
  }
];
