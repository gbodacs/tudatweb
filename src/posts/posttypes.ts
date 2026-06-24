export type Translate = (key: string) => string

export interface BlogPost {
    title: string
    summary: string
    id: string
    date: string
    readTime: string
    eyebrow: string
    body: string
}