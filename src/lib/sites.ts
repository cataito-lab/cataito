// 子站（生态入口）单一数据源
// 新子站上线时：在此追加条目 + 在 messages/*.json 的 sites 段补 name/desc 词条，
// Header 桌面下拉、移动端菜单区块、Footer 生态列会自动渲染，无需再改组件。
import type { LucideIcon } from 'lucide-react';
import { Wrench, Newspaper } from 'lucide-react';

export interface SiteEntry {
  /** 对应 messages 里 sites.<id>.name / sites.<id>.desc */
  id: string;
  url: string;
  icon: LucideIcon;
}

export const SITES: SiteEntry[] = [
  {
    id: 'tools',
    url: 'https://tools.cataito.com/',
    icon: Wrench,
  },
  {
    id: 'aihot',
    url: 'https://aihot.cataito.com/',
    icon: Newspaper,
  },
];
