export interface Diagnosis {
  id: string;
  name: string;
}

export interface Clue {
  text: string;
  imageUrl?: string;
}

export interface Game {
  id: string;
  title: string;
  author?: string;
  answer_id: string;
  clues: Clue[];
  created_at: string;
}

export interface AnkiPack {
  id: string;
  name: string;
  description: string;
  file_path: string;
  created_at: string;
}
