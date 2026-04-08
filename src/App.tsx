import { useState, useMemo, useEffect } from "react";
import { Search, MapPin, Utensils, TrendingDown, Loader2, AlertCircle, Info, List, Map as MapIcon, Plus, X, ChevronDown, Heart, MessageCircle, Share2, Navigation, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { getBudgetRestaurants, getGeocode, type Restaurant } from "./lib/gemini";
import { cn } from "./lib/utils";

// Fix Leaflet default icon issue
// @ts-ignore
import markerIcon from "leaflet/dist/images/marker-icon.png";
// @ts-ignore
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const CITIES = [
  "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", 
  "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천"
];

const CITY_COORDS: Record<string, [number, number]> = {
  "창원": [35.228, 128.681],
  "진주": [35.180, 128.084],
  "통영": [34.854, 128.433],
  "사천": [35.003, 128.064],
  "김해": [35.233, 128.881],
  "밀양": [35.503, 128.748],
  "거제": [34.891, 128.621],
  "양산": [35.338, 129.037],
  "의령": [35.322, 128.261],
  "함안": [35.272, 128.406],
  "창녕": [35.541, 128.492],
  "고성": [34.976, 128.323],
  "남해": [34.837, 127.892],
  "하동": [35.067, 127.751],
  "산청": [35.415, 127.879],
  "함양": [35.520, 127.725],
  "거창": [35.686, 127.909],
  "합천": [35.566, 128.165]
};

const ICON_MAP = {
  rice: "🍚",
  noodle: "🍜",
  meat: "🍖",
  soup: "🍲",
  bread: "🍞",
  fish: "🐟",
  tofu: "🥣"
};

const RANKING_DATA = [
  { id: 1, name: "동부회센타 진해", score: 81, rating: 4.5, reviews: 24, category: "횟집", tags: ["모듬회", "가성비좋은", "회식"], desc: "가성비 좋은 횟집 입니다." },
  { id: 2, name: "명촌식당 통영", score: 75, rating: 4.7, reviews: 7, category: "생선구이", tags: ["가성비", "가족외식", "서민적인"], desc: "통영 서호시장 인근에 위치한 생선구이 전문 식당" },
  { id: 3, name: "청춘키친 창원", score: 74, rating: 4.6, reviews: 24, category: "파스타", tags: ["샐러드", "가성비좋은", "데이트"], desc: "가성비 좋은 양식 맛집입니다." },
  { id: 4, name: "또바기 반다찌 통영", score: 70, rating: 4.6, reviews: 6, category: "횟집", tags: ["다찌", "가성비좋은", "술모임"], desc: "가성비와 음식 술 다 호응이 좋은 다찌집" },
  { id: 5, name: "참수타 창원", score: 68, rating: 4.6, reviews: 8, category: "짜장면", tags: ["탕수육", "가성비좋은", "식사모임"], desc: "가성비 좋은 오랫동안 유명한 중국집입니다" },
  { id: 6, name: "수제비칼국수 전문점 김해", score: 76, rating: 4.6, reviews: 16, category: "칼국수", tags: ["굴칼국수", "가성비", "혼밥"], desc: "저렴한 가격에 많은 해물이 들어간 가성비 좋은 칼국수" },
  { id: 7, name: "이랑수산생국수 김해", score: 75, rating: 4.7, reviews: 17, category: "칼국수", tags: ["해물칼국수", "가성비", "가족외식"], desc: "정말 푸짐한 양에 신선한 해물이 잔뜩 들어있는 칼국수" },
  { id: 8, name: "본가돌솥밥 마산합성동", score: 69, rating: 5.0, reviews: 3, category: "돌솥밥", tags: ["생선구이", "가성비좋은", "가족외식"], desc: "반찬이 엄청 푸짐합니다. 가성비 짱 찐맛집!" },
  { id: 9, name: "정화순대 통영", score: 75, rating: 4.5, reviews: 18, category: "분식", tags: ["순대", "가성비좋은", "서민적인"], desc: "통영 중앙시장의 줄 서서 먹는 순대 맛집" },
  { id: 10, name: "원돼지국밥 창원", score: 82, rating: 4.9, reviews: 14, category: "국밥", tags: ["돼지국밥", "가성비좋은", "혼밥"], desc: "창원 상남동의 가성비 좋고 든든한 돼지국밥" },
  { id: 11, name: "다담뜰한식뷔페 양산점", score: 68, rating: 3.8, reviews: 6, category: "한식뷔페", tags: ["가성비", "식사모임", "무료주차"], desc: "음식 종류가 많고 가성비 좋은 한식 뷔페" },
  { id: 12, name: "바닷가횟집 사천", score: 68, rating: 5.0, reviews: 2, category: "횟집", tags: ["회정식", "가성비", "단체모임"], desc: "회정식이 정말 많이 나오는 가성비 좋은 횟집" },
  { id: 13, name: "장터칼국수 김해", score: 69, rating: 4.7, reviews: 5, category: "칼국수", tags: ["김밥", "가성비좋은", "서민적인"], desc: "가성비 좋은 가격으로 배부른 한 끼" },
  { id: 14, name: "메가커피 양산센텀힐병원점", score: 63, rating: 5.0, reviews: 1, category: "커피", tags: ["딸기라떼", "가성비", "가성비좋은"], desc: "깔끔하고 매장도 넓은 가성비 커피" },
  { id: 15, name: "혜자초밥 양산서창", score: 69, rating: 4.9, reviews: 5, category: "초밥", tags: ["라멘", "초밥", "가성비좋은"], desc: "생선 비린내 없고 깔끔한 가성비 초밥" },
  { id: 16, name: "1000cc커피 물금점", score: 68, rating: 4.7, reviews: 3, category: "커피", tags: ["카페", "가성비좋은", "차모임"], desc: "커피 맛도 좋고 양은 정말 많은 가성비 카페" },
  { id: 17, name: "옛날짜장면 창원", score: 65, rating: 5.0, reviews: 1, category: "짜장면", tags: ["옛날짜장면", "가성비", "혼밥"], desc: "고기 식감이 부드럽고 가성비 좋은 짜장면" },
  { id: 18, name: "동피랑쭈굴 통영", score: 69, rating: 4.0, reviews: 15, category: "굴요리", tags: ["쭈꾸미", "가성비", "식사모임"], desc: "가성비 좋은 굴요리 맛집" },
  { id: 19, name: "새삼 양산본점", score: 73, rating: 5.0, reviews: 5, category: "냉삼", tags: ["새우", "가성비좋은", "술모임"], desc: "고기와 새우가 맛있고 소주가 저렴한 곳" },
  { id: 20, name: "푼푼 창원가로수길", score: 76, rating: 4.5, reviews: 12, category: "일식", tags: ["퓨전일식", "가성비좋은", "데이트"], desc: "가성비 좋은 일식 맛집" },
  { id: 21, name: "상남시장 윌슨98", score: 78, rating: 4.8, reviews: 15, category: "돈까스", tags: ["상남동", "가성비", "수제돈까스"], desc: "상남시장 내 위치한 숨은 돈까스 강자" },
  { id: 22, name: "창원대 우영프라자 밥집", score: 72, rating: 4.4, reviews: 10, category: "백반", tags: ["학생맛집", "가성비", "무한리필"], desc: "창원대 학생들의 영원한 안식처, 가성비 백반" },
  { id: 23, name: "진주 경상대 정문 국밥", score: 74, rating: 4.5, reviews: 12, category: "국밥", tags: ["대학로", "가성비", "든든한"], desc: "경상대 학생들의 해장을 책임지는 곳" },
  { id: 24, name: "김해 인제대 뒷고기", score: 79, rating: 4.7, reviews: 18, category: "고기", tags: ["뒷고기", "가성비", "술안주"], desc: "김해하면 뒷고기, 뒷고기하면 이곳!" },
  { id: 25, name: "마산 댓거리 떡볶이", score: 71, rating: 4.3, reviews: 8, category: "분식", tags: ["추억의맛", "가성비", "매콤한"], desc: "경남대 학생들의 추억이 담긴 떡볶이 맛집" },
  { id: 26, name: "거제 고현시장 칼국수", score: 75, rating: 4.6, reviews: 14, category: "칼국수", tags: ["시장맛집", "가성비", "시원한"], desc: "거제 현지인들이 즐겨 찾는 시장 칼국수" },
  { id: 27, name: "양산 증산역 돈까스", score: 70, rating: 4.2, reviews: 6, category: "돈까스", tags: ["가족외식", "가성비", "바삭한"], desc: "아이들과 함께 가기 좋은 가성비 돈까스집" },
  { id: 28, name: "통영 무전동 찌개", score: 73, rating: 4.5, reviews: 9, category: "찌개", tags: ["직장인맛집", "가성비", "집밥"], desc: "무전동 직장인들의 점심을 책임지는 찌개 맛집" },
  { id: 29, name: "사천 읍내 국수", score: 69, rating: 4.1, reviews: 5, category: "국수", tags: ["간단한식사", "가성비", "멸치육수"], desc: "진한 멸치육수가 일품인 사천 가성비 국수" },
  { id: 30, name: "밀양 내일동 곰탕", score: 76, rating: 4.7, reviews: 11, category: "곰탕", tags: ["보양식", "가성비", "진한맛"], desc: "밀양 시장 근처의 가성비 좋은 곰탕집" },
  { id: 31, name: "창원 상남동 유탑 밥집", score: 80, rating: 4.9, reviews: 20, category: "백반", tags: ["상남동", "가성비", "반찬다양"], desc: "상남동에서 이 가격에 이 반찬이라니!" },
  { id: 32, name: "진주 하대동 고기집", score: 77, rating: 4.6, reviews: 14, category: "고기", tags: ["하대동", "가성비", "회식추천"], desc: "하대동 주민들이 인정하는 가성비 고기 맛집" },
  { id: 33, name: "김해 내동 분식", score: 68, rating: 4.0, reviews: 7, category: "분식", tags: ["내동", "가성비", "간식"], desc: "내동 먹자골목의 터줏대감 분식집" },
  { id: 34, name: "마산 합성동 파스타", score: 74, rating: 4.5, reviews: 13, category: "파스타", tags: ["합성동", "가성비", "데이트코스"], desc: "합성동에서 가장 가성비 좋은 양식당" },
  { id: 35, name: "창원 중앙동 오거리 식당", score: 79, rating: 4.8, reviews: 16, category: "한식", tags: ["중앙동", "가성비", "노포맛집"], desc: "중앙동 직장인들의 성지, 가성비 한식 노포" },
  { id: 36, name: "덕수파스타 상남점", score: 85, rating: 4.9, reviews: 42, category: "파스타", tags: ["상남동", "가성비", "트렌디"], desc: "상남동에서 가장 핫한 가성비 파스타" },
  { id: 37, name: "창원 상남동 청춘키친", score: 84, rating: 4.8, reviews: 38, category: "양식", tags: ["상남동", "가성비", "샐러드"], desc: "줄 서서 먹는 창원 대표 가성비 양식당" },
  { id: 38, name: "창원 상남동 원돼지국밥", score: 83, rating: 4.7, reviews: 25, category: "국밥", tags: ["상남동", "가성비", "든든한"], desc: "상남동 직장인들이 가장 선호하는 국밥집" },
  { id: 39, name: "창원 중앙동 초가집", score: 81, rating: 4.6, reviews: 22, category: "찜", tags: ["중앙동", "꽃게찜", "가성비"], desc: "중앙동에서 유명한 꽃게찜 가성비 맛집" },
  { id: 40, name: "창원 도계동 도계시장 족발", score: 78, rating: 4.5, reviews: 15, category: "족발", tags: ["도계동", "시장맛집", "가성비"], desc: "도계시장에서 가장 푸짐한 가성비 족발" },
  { id: 41, name: "진해 경화시장 국밥", score: 76, rating: 4.4, reviews: 12, category: "국밥", tags: ["경화동", "시장맛집", "가성비"], desc: "경화시장 장날에 꼭 먹어야 하는 국밥" },
  { id: 42, name: "창원 팔용동 임진각식당", score: 82, rating: 4.7, reviews: 30, category: "석쇠불고기", tags: ["팔용동", "가성비", "가족외식"], desc: "달콤한 석쇠불고기가 일품인 가성비 맛집" },
  { id: 43, name: "창원 봉곡동 명곡시장 떡볶이", score: 75, rating: 4.3, reviews: 10, category: "분식", tags: ["봉곡동", "시장맛집", "가성비"], desc: "봉곡동 주민들의 영원한 간식 맛집" },
  { id: 44, name: "창원 신월동 토담", score: 79, rating: 4.6, reviews: 18, category: "한식", tags: ["신월동", "가성비", "청국장"], desc: "구수한 청국장과 보리밥이 맛있는 가성비 집" },
  { id: 45, name: "창원 소답동 소답시장 국수", score: 74, rating: 4.4, reviews: 9, category: "국수", tags: ["소답동", "시장맛집", "가성비"], desc: "소답시장의 정겨운 가성비 국수집" },
];

// Custom Price Tag Icon
const createPriceTagIcon = (price: string, iconType: string) => {
  const priceValue = price.match(/\d+(,\d+)?/)?.[0] || "7,000";
  const numPrice = parseInt(priceValue.replace(/,/g, ""));
  
  // Color based on price
  let borderColor = "#FF6B00"; // Default Orange
  let bgColor = "white";
  if (numPrice <= 5000) borderColor = "#22C55E"; // Green for very cheap
  else if (numPrice >= 9000) borderColor = "#EF4444"; // Red for more expensive (though we aim for budget)

  const iconEmoji = ICON_MAP[iconType as keyof typeof ICON_MAP] || "💰";

  return L.divIcon({
    className: "custom-price-tag",
    html: `
      <div class="flex flex-row items-center gap-0.5 bg-white border-[1px] rounded-full px-2 py-0 shadow-sm transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform" style="border-color: ${borderColor}">
        <span class="text-[7px] leading-none">${iconEmoji}</span>
        <span class="text-[8px] font-bold text-[#1A1A1A] whitespace-nowrap leading-none">${priceValue}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function App() {
  const [city, setCity] = useState("창원");
  const [category, setCategory] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([
    { name: "진주 제일식당", lat: 35.1925, lng: 128.0838, price: "7,000원", description: "육회비빔밥 가성비 맛집", location: "진주 중앙시장", reason: "전통 있는 맛과 푸짐한 양", iconType: "rice" },
    { name: "창원 반송시장 칼국수", lat: 35.2355, lng: 128.6655, price: "6,000원", description: "양 많고 저렴한 시장 국수", location: "창원 반송시장", reason: "시장 인심이 듬뿍 담긴 가격", iconType: "noodle" },
    { name: "덕수파스타 상남점", lat: 35.2225, lng: 128.6865, price: "9,900원", description: "상남동 가성비 파스타 맛집", location: "창원 상남동", reason: "푸짐한 양과 트렌디한 맛", iconType: "noodle" },
    { name: "상남시장 윌슨98", lat: 35.2215, lng: 128.6845, price: "8,500원", description: "수제 돈까스 전문점", location: "창원 상남동", reason: "상남시장 숨은 돈까스 강자", iconType: "meat" },
    { name: "중앙동 오거리 식당", lat: 35.2242, lng: 128.6785, price: "7,000원", description: "든든한 한식 백반 노포", location: "창원 중앙동", reason: "직장인들의 성지, 푸짐한 반찬", iconType: "rice" },
    { name: "상남동 유탑 밥집", lat: 35.2205, lng: 128.6875, price: "8,000원", description: "가성비 최고 백반집", location: "창원 상남동", reason: "다양한 반찬과 집밥 느낌", iconType: "rice" },
    { name: "청춘키친", lat: 35.2218, lng: 128.6858, price: "9,000원", description: "샐러드와 파스타 맛집", location: "창원 상남동", reason: "줄 서서 먹는 가성비 양식", iconType: "noodle" },
    { name: "원돼지국밥", lat: 35.2212, lng: 128.6842, price: "8,500원", description: "상남동 대표 돼지국밥", location: "창원 상남동", reason: "진한 국물과 넉넉한 고기", iconType: "soup" },
    { name: "푼푼 창원가로수길", lat: 35.2325, lng: 128.6825, price: "12,000원", description: "퓨전 일식 맛집", location: "창원 용호동", reason: "가로수길에서 즐기는 깔끔한 일식", iconType: "rice" },
    { name: "창원대 우영프라자 밥집", lat: 35.2455, lng: 128.6925, price: "6,500원", description: "학생들을 위한 가성비 백반", location: "창원 사림동", reason: "저렴한 가격에 무한 리필 반찬", iconType: "rice" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListViewOpen, setIsListViewOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "geojibang" | "lunch" | "ranking" | "wishlist">("map");
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedRestaurantForReview, setSelectedRestaurantForReview] = useState<Restaurant | null>(null);

  const toggleFavorite = (name: string) => {
    setFavorites(prev => 
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    );
  };

  const filteredRestaurants = restaurants.filter(r => {
    const price = parseInt(r.price.replace(/[^0-9]/g, "")) || 0;
    return price <= maxPrice;
  });

  const favoriteRestaurants = restaurants.filter(r => favorites.includes(r.name));

  // Mock Data for Geojibang and Lunch Discount
  const geojibangPosts = [
    { id: 1, user: "절약왕", content: "오늘 점심은 편의점 2+1 도시락으로 해결! 3,500원의 행복입니다.", likes: 24, comments: 5 },
    { id: 2, user: "창원거지", content: "반송시장 칼국수 곱빼기 시켜서 친구랑 나눠먹기 성공. 인당 3,500원!", likes: 56, comments: 12 },
    { id: 3, user: "진주프로", content: "커피는 집에서 타온 카누가 최고죠. 스벅 갈 돈으로 국밥 한 그릇 더 먹습니다.", likes: 89, comments: 21 },
  ];

  const lunchDeals = [
    { id: 1, title: "창원 식당A", deal: "평일 런치 11:30~14:00 김치찌개 6,000원", time: "평일 한정" },
    { id: 2, title: "진주 식당B", deal: "점심 특선 생선구이 정식 8,000원 (2인 이상)", time: "11:00~15:00" },
    { id: 3, title: "김해 식당C", deal: "런치 타임 라면 사리 무한 리필", time: "12:00~14:00" },
  ];

  // New Restaurant Form State
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const mapCenter = useMemo(() => (CITY_COORDS[city] || [35.228, 128.681]) as [number, number], [city]);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await getBudgetRestaurants(city, category || "전체");
      setRestaurants(results);
      if (results.length === 0) {
        setError("검색 결과가 없습니다. 다른 조건으로 시도해보세요.");
      }
    } catch (err) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRestaurant = async () => {
    if (!newName) return;
    setIsAdding(true);
    try {
      const coords = await getGeocode(newName);
      if (coords) {
        const newRes: Restaurant = {
          name: newName,
          price: newPrice || "가격 미정",
          description: newDesc || "사용자가 추가한 맛집",
          location: city,
          reason: "직접 제보한 가성비 맛집",
          lat: coords.lat,
          lng: coords.lng,
          iconType: "rice"
        };
        setRestaurants(prev => [newRes, ...prev]);
        setNewName("");
        setNewPrice("");
        setNewDesc("");
        setIsSidebarOpen(false);
      } else {
        alert("위치 정보를 찾을 수 없습니다. 정확한 식당 이름을 입력해주세요.");
      }
    } catch (err) {
      alert("맛집 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans relative overflow-hidden flex flex-col">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ChangeView center={mapCenter} />
          
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            showCoverageOnHover={false}
          >
            {filteredRestaurants.map((res, idx) => (
              <Marker
                key={`${res.name}-${idx}`}
                position={[res.lat, res.lng]}
                icon={createPriceTagIcon(res.price, res.iconType)}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[200px]">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-[#1A1A1A]">{res.name}</h3>
                      <button 
                        onClick={() => toggleFavorite(res.name)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Heart className={cn("w-5 h-5", favorites.includes(res.name) ? "text-[#FF6B00] fill-[#FF6B00]" : "text-gray-300")} />
                      </button>
                    </div>
                    <p className="text-[#FF6B00] font-black text-sm mb-1">{res.price}</p>
                    <p className="text-xs text-gray-500 mb-2">{res.description}</p>
                    <div className="bg-[#F8F9FA] p-2 rounded-xl mb-3">
                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        <span className="font-bold text-[#FF6B00]">💡 추천이유:</span> {res.reason}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-[#1A1A1A] text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                        <Navigation className="w-3 h-3" /> 길찾기
                      </button>
                      <button 
                        onClick={() => setSelectedRestaurantForReview(res)}
                        className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Star className="w-3 h-3 text-yellow-400" /> 평가하기
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Floating Top Bar */}
      <div className="absolute top-4 left-0 right-0 z-[1001] px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white/90 backdrop-blur-md rounded-full shadow-xl border border-white/50 p-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1 pl-4 pr-2 border-r border-gray-200">
              <span className="text-xs font-black text-[#FF6B00]">랭킹</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer p-0"
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="가성비 맛집 검색..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium py-2 pl-2"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-[#1A1A1A] text-white p-2 rounded-full hover:bg-black transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Quick Filters */}
          <div className="flex items-center gap-1 mt-1">
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-all shadow-sm bg-white/90 backdrop-blur-md",
                  maxPrice < 10000 ? "border-[#FF6B00] text-[#FF6B00]" : "border-gray-200 text-gray-500"
                )}
              >
                💰 {maxPrice === 10000 ? "가격" : `${(maxPrice/1000)}천`}
                <ChevronDown className={cn("w-3 h-3 transition-transform", isPriceFilterOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isPriceFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 mt-1 w-28 bg-white rounded-xl shadow-2xl border border-gray-100 z-[2000] overflow-hidden"
                  >
                    {[5000, 7000, 8000, 10000].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setMaxPrice(p);
                          setIsPriceFilterOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-[11px] font-bold transition-colors border-b border-gray-50 last:border-none",
                          maxPrice === p ? "bg-[#FFF4EB] text-[#FF6B00]" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {p === 10000 ? "전체 가격" : `~${p.toLocaleString()}원`}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="w-[1px] h-4 bg-gray-200 mx-1" />
            
            <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {["상남동", "합성동", "조기구이", "갈치구이", "두부조림", "국밥", "칼국수"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setCategory(tag);
                    handleSearch();
                  }}
                  className="whitespace-nowrap bg-white/80 backdrop-blur-md px-2 py-1 rounded-full text-[9px] font-bold border border-gray-200 shadow-sm hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Nav */}
      <div className="absolute bottom-8 left-0 right-0 z-[1001] px-4 flex flex-col items-center gap-4">
        <div className="bg-[#1A1A1A]/90 backdrop-blur-md rounded-full p-1 flex items-center shadow-2xl">
          <button
            onClick={() => setActiveTab("map")}
            className={cn(
              "px-4 py-2.5 rounded-full text-xs font-bold transition-all",
              activeTab === "map" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            맵
          </button>
          <button
            onClick={() => setActiveTab("geojibang")}
            className={cn(
              "px-4 py-2.5 rounded-full text-xs font-bold transition-all",
              activeTab === "geojibang" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            거지방
          </button>
          <button
            onClick={() => setActiveTab("lunch")}
            className={cn(
              "px-4 py-2.5 rounded-full text-xs font-bold transition-all",
              activeTab === "lunch" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            점심특가
          </button>
          <button
            onClick={() => setActiveTab("ranking")}
            className={cn(
              "px-4 py-2.5 rounded-full text-xs font-bold transition-all",
              activeTab === "ranking" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            랭킹
          </button>
        </div>
      </div>

      {/* Floating Action Buttons */}
      {activeTab === "map" && (
        <>
          <div className="absolute bottom-24 left-4 z-[1001]">
            <button
              onClick={() => setIsListViewOpen(true)}
              className="bg-[#1A1A1A] text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 hover:bg-black transition-all active:scale-95"
            >
              <List className="w-4 h-4" />
              목록
            </button>
          </div>

          <div className="absolute bottom-24 right-4 z-[1001] flex flex-col gap-3">
            <button 
              onClick={() => setActiveTab("wishlist")}
              className="bg-white p-3 rounded-full shadow-xl hover:bg-gray-50 transition-all active:scale-90 relative"
            >
              <Heart className={cn("w-5 h-5", favorites.length > 0 ? "text-[#FF6B00] fill-[#FF6B00]" : "text-gray-400")} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
            <button className="bg-white p-3 rounded-full shadow-xl hover:bg-gray-50 transition-all active:scale-90">
              <MessageCircle className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="bg-[#FF6B00] p-3 rounded-full shadow-xl text-white hover:bg-[#E66000] transition-all active:scale-90"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button className="bg-white p-3 rounded-full shadow-xl hover:bg-gray-50 transition-all active:scale-90">
              <Navigation className="w-5 h-5 text-[#FF6B00]" />
            </button>
          </div>
        </>
      )}

      {/* Geojibang View */}
      <AnimatePresence>
        {activeTab === "geojibang" && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute inset-0 z-[1002] bg-[#F8F9FA] flex flex-col"
          >
            {/* Header with Back Button */}
            <div className="p-4 border-b bg-white flex items-center gap-4 sticky top-0 z-10">
              <button 
                onClick={() => setActiveTab("map")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-bold">💸 거지방 (절약 커뮤니티)</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
              <div className="max-w-md mx-auto w-full space-y-4">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5E5]">
                  <p className="text-sm text-gray-500">서로의 지출을 감시하고 절약 꿀팁을 공유하는 공간입니다.</p>
                </div>
                {geojibangPosts.map(post => (
                  <div key={post.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5E5] space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#FF6B00] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {post.user[0]}
                      </div>
                      <span className="font-bold text-sm">{post.user}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{post.content}</p>
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                      <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#FF6B00]">
                        <Heart className="w-4 h-4" /> {post.likes}
                      </button>
                      <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#FF6B00]">
                        <MessageCircle className="w-4 h-4" /> {post.comments}
                      </button>
                    </div>
                  </div>
                ))}
                <button className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 font-bold shadow-lg">
                  나도 절약 꿀팁 올리기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lunch Discount View */}
      <AnimatePresence>
        {activeTab === "lunch" && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute inset-0 z-[1002] bg-[#F8F9FA] flex flex-col"
          >
            {/* Header with Back Button */}
            <div className="p-4 border-b bg-white flex items-center gap-4 sticky top-0 z-10">
              <button 
                onClick={() => setActiveTab("map")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-bold">🍱 점심 런치할인</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
              <div className="max-w-md mx-auto w-full space-y-4">
                <div className="bg-[#FF6B00] rounded-3xl p-6 shadow-lg text-white">
                  <p className="text-sm opacity-90">경남 지역 식당들의 점심 특가 정보를 모았습니다.</p>
                </div>
                {lunchDeals.map(deal => (
                  <div key={deal.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5E5] flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-gray-500">{deal.title}</h3>
                      <p className="font-black text-lg">{deal.deal}</p>
                      <span className="text-[10px] font-bold bg-[#FFF4EB] text-[#FF6B00] px-2 py-0.5 rounded-full">{deal.time}</span>
                    </div>
                    <button className="bg-[#1A1A1A] text-white p-3 rounded-full shadow-md">
                      <Navigation className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranking View */}
      <AnimatePresence>
        {activeTab === "ranking" && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-[1002] bg-[#F8F9FA] flex flex-col"
          >
            {/* Header with Back Button */}
            <div className="p-4 border-b bg-white flex items-center gap-4 sticky top-0 z-10">
              <button 
                onClick={() => setActiveTab("map")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-bold">🏆 경남 음식 랭킹</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
              <div className="max-w-md mx-auto w-full space-y-4">
                {RANKING_DATA.map((item, index) => (
                  <div key={item.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5E5] relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-[#FF6B00] text-white px-3 py-1 font-black text-sm rounded-br-2xl">
                      {index + 1}
                    </div>
                    <div className="pl-8 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <span className="text-[#FF6B00] font-black">{item.score}점</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                        <span className="text-yellow-400">★</span> {item.rating} ({item.reviews}명)
                        <span className="mx-1">·</span> {item.category}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">#{tag}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 italic">"{item.desc}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wishlist View */}
      <AnimatePresence>
        {activeTab === "wishlist" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[1002] bg-[#F8F9FA] flex flex-col"
          >
            <div className="p-4 border-b bg-white flex items-center gap-4 sticky top-0 z-10">
              <button 
                onClick={() => setActiveTab("map")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-bold">❤️ 나의 찜목록</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
              <div className="max-w-md mx-auto w-full space-y-4">
                {favoriteRestaurants.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Heart className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">아직 찜한 맛집이 없어요.<br/>지도의 하트 아이콘을 눌러보세요!</p>
                  </div>
                ) : (
                  favoriteRestaurants.map(res => (
                    <div key={res.name} className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5E5] space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{res.name}</h3>
                          <p className="text-[#FF6B00] font-black">{res.price}</p>
                        </div>
                        <button 
                          onClick={() => toggleFavorite(res.name)}
                          className="p-2 bg-[#FFF4EB] rounded-full"
                        >
                          <Heart className="w-5 h-5 text-[#FF6B00] fill-[#FF6B00]" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">{res.description}</p>
                      <div className="flex gap-2 pt-2">
                        <button className="flex-1 bg-[#1A1A1A] text-white py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                          <Navigation className="w-4 h-4" /> 길찾기
                        </button>
                        <button 
                          onClick={() => setSelectedRestaurantForReview(res)}
                          className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <Star className="w-4 h-4 text-yellow-400" /> 평가하기
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal (평가대) */}
      <AnimatePresence>
        {selectedRestaurantForReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black">⭐ 평가대</h2>
                  <button 
                    onClick={() => setSelectedRestaurantForReview(null)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-[#1A1A1A]">{selectedRestaurantForReview.name}</h3>
                  <p className="text-gray-500 text-sm">이 식당의 가성비는 어떠셨나요?</p>
                </div>

                <div className="flex justify-center gap-2 py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} className="p-1">
                      <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <textarea 
                    placeholder="맛, 양, 가격에 대한 솔직한 후기를 남겨주세요!"
                    className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm min-h-[120px] focus:ring-2 focus:ring-[#FF6B00]"
                  />
                  <button 
                    onClick={() => {
                      alert("평가가 등록되었습니다!");
                      setSelectedRestaurantForReview(null);
                    }}
                    className="w-full bg-[#FF6B00] text-white py-5 rounded-3xl font-black shadow-lg shadow-[#FF6B00]/20 active:scale-95 transition-all"
                  >
                    평가 등록하기
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List View Overlay */}
      <AnimatePresence>
        {isListViewOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[2000] bg-[#F8F9FA] flex flex-col"
          >
            <div className="p-4 border-b bg-white flex items-center justify-between sticky top-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-[#FF6B00]">{city}</span> 가성비 리스트
              </h2>
              <button onClick={() => setIsListViewOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {restaurants.map((res, idx) => (
                <div key={res.name} className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5E5]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{ICON_MAP[res.iconType as keyof typeof ICON_MAP] || "💰"}</span>
                    <h3 className="text-lg font-bold">{res.name}</h3>
                  </div>
                  <p className="text-sm text-[#444] mb-4">{res.description}</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FF6B00] bg-[#FFF4EB] px-3 py-1.5 rounded-full w-fit">
                    {res.price}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Restaurant Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[2002]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white z-[2003] shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#FF6B00]" />
                  맛집 제보하기
                </h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-[#F1F3F5] rounded-full transition-colors">
                  <X className="w-5 h-5 text-[#999]" />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#999] uppercase tracking-wider">식당 이름</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="예: 진주 제일식당"
                    className="w-full bg-[#F1F3F5] border-none rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-[#FF6B00] transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#999] uppercase tracking-wider">가격 정보</label>
                  <input
                    type="text"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="예: 7,000원"
                    className="w-full bg-[#F1F3F5] border-none rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-[#FF6B00] transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#999] uppercase tracking-wider">특징/설명</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="식당의 매력을 알려주세요"
                    rows={4}
                    className="w-full bg-[#F1F3F5] border-none rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-[#FF6B00] transition-all font-medium resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleAddRestaurant}
                disabled={isAdding || !newName}
                className="w-full bg-[#FF6B00] text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-[#E66000] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-orange-100 mt-6"
              >
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingDown className="w-5 h-5" />}
                내 지도에 저장하기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Disclaimer Overlay (Small) */}
      <div className="absolute top-20 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
        <div className="bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50 shadow-sm">
          <p className="text-[10px] font-bold text-gray-500">모수가 적습니다. 참고만 해주세요.</p>
        </div>
      </div>
    </div>
  );
}
