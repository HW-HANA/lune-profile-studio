import { defaultCrop, type ImageCrop } from "./crop";
export type Theme = "light" | "pink" | "night" | "custom";
export type Mode = "profile" | "posts" | "chat";
export type MessageType =
  | "text"
  | "image"
  | "text-image"
  | "date"
  | "system"
  | "typing"
  | "voice"
  | "withdrawn";
export interface Message {
  id: string;
  role: "me" | "them";
  type: MessageType;
  text: string;
  image: string;
  timestamp: string;
  read: boolean;
}
export interface Post {
  id: string;
  text: string;
  time: string;
  images: string[];
  comments: string;
  reposts: string;
  likes: string;
  imageAspect: "auto" | "square" | "portrait" | "landscape";
  imagePosition: string;
  imageCrops: ImageCrop[];
}
export interface Profile {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  cover: string;
  avatarPosition: string;
  coverPosition: string;
  avatarCrop: ImageCrop;
  coverCrop: ImageCrop;
  location: string;
  joined: string;
  website: string;
  following: string;
  followers: string;
  tags: string;
  verified: boolean;
  followLabel: string;
  messageLabel: string;
  tab: "posts" | "media" | "about";
  posts: Post[];
}
export interface Project {
  title: string;
  mode: Mode;
  theme: Theme;
  colors: import("./theme").Palette;
  font: { name: string; data: string };
  profile: Profile;
  chat: {
    name: string;
    avatar: string;
    myAvatar: string;
    status: string;
    showTimestamp: boolean;
    showComposer: boolean;
    messages: Message[];
  };
  canvas: {
    width: number;
    height: number;
    background: string;
    image: string;
    padding: number;
  };
}
export const uid = () => crypto.randomUUID();
export const newMessage = (): Message => ({
  id: uid(),
  role: "them",
  type: "text",
  text: "在这里写下故事的下一句。",
  image: "",
  timestamp: "14:32",
  read: false,
});
export const newPost = (): Post => ({
  id: uid(),
  text: "记录一个值得收藏的瞬间。",
  time: "刚刚",
  images: [],
  comments: "0",
  reposts: "0",
  likes: "0",
  imageAspect: "auto",
  imagePosition: "50% 50%",
  imageCrops: [],
});
export function initialProject(): Project {
  return {
    title: "",
    mode: "profile",
    theme: "pink",
    colors: {
      surface: "#ffffff",
      accent: "#111113",
      text: "#18181a",
      cover: "#f3f3f5",
      avatar: "#f3f3f5",
      avatarIcon: "#898a8d",
      tag: "#f3f3f5",
      tagText: "#898a8d",
      muted: "#898a8d",
      line: "#ececee",
      buttonText: "#ffffff",
      badge: "#93a38b",
    },
    font: { name: "", data: "" },
    profile: {
      name: "天使用户",
      username: "AngelUser",
      bio: "我甚至相信你拥有整个宇宙。",
      avatar: "",
      cover: "",
      avatarPosition: "50% 50%",
      coverPosition: "50% 50%",
      avatarCrop: defaultCrop(),
      coverCrop: defaultCrop(),
      location: "你的心里",
      joined: "2024 年 3 月加入",
      website: "",
      following: "1",
      followers: "999K",
      tags: "狗",
      verified: true,
      followLabel: "关注",
      messageLabel: "私信",
      tab: "posts",
      posts: [
        {
          id: uid(),
          text: "当我跨过沉沦的一切，\n向着永恒开战的时候，\n你是我的军旗。",
          time: "3 小时前",
          images: ["./assets/hands.jpg"],
          comments: "999",
          reposts: "521",
          likes: "1314",
          imageAspect: "auto",
          imagePosition: "50% 50%",
          imageCrops: [defaultCrop()],
        },
      ],
    },
    chat: {
      name: "林间",
      avatar: "./assets/avatar.jpg",
      myAvatar: "",
      status: "在线",
      showTimestamp: false,
      showComposer: true,
      messages: [
        { ...newMessage(), type: "date", text: "今天 · 14:30" },
        { ...newMessage(), text: "今天的阳光好温柔。" },
        { ...newMessage(), text: "要不要一起出去走走？" },
        {
          ...newMessage(),
          role: "me",
          text: "好呀，去上次那家咖啡店 ☕",
          read: true,
        },
        { ...newMessage(), type: "image", image: "./assets/hands.jpg" },
        { ...newMessage(), text: "给你留了靠窗的位置。" },
        {
          ...newMessage(),
          role: "me",
          text: "等我，带一束花来见你。",
          read: true,
        },
      ],
    },
    canvas: {
      width: 1080,
      height: 1440,
      background: "#eeeae5",
      image: "",
      padding: 36,
    },
  };
}
const canGroup = (m?: Message) =>
  !!m && ["text", "image", "text-image", "voice"].includes(m.type);
export function groupPosition(
  messages: Message[],
  index: number,
): "single" | "first" | "middle" | "last" {
  const cur = messages[index];
  if (!canGroup(cur)) return "single";
  const prev = messages[index - 1],
    next = messages[index + 1];
  const before = canGroup(prev) && prev.role === cur.role;
  const after = canGroup(next) && next.role === cur.role;
  return before ? (after ? "middle" : "last") : after ? "first" : "single";
}
export const presets = [
  { name: "小红书", width: 1080, height: 1440 },
  { name: "正方形", width: 1080, height: 1080 },
  { name: "Story", width: 1080, height: 1920 },
  { name: "横版", width: 1600, height: 900 },
  { name: "手机", width: 1170, height: 2532 },
];
