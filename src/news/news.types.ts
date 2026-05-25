export interface INewsItem {
  edition_id: null | number;
  ge_id: string;
  image: string;
  link: string;
  summary: string;
  timestamp: number;
  title: string;
}

export interface INewsSyncStats {
  duration: number;
  errors: number;
  inserted: number;
  lastSync: number;
  totalFetched: number;
}
