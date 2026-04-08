import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Restaurant {
  name: string;
  price: string;
  description: string;
  location: string;
  reason: string;
  lat: number;
  lng: number;
  iconType: "rice" | "noodle" | "meat" | "soup" | "bread" | "fish" | "tofu";
}

export async function getBudgetRestaurants(city: string, category: string): Promise<Restaurant[]> {
  const prompt = `
    당신은 다이닝코드(DiningCode) 수준의 정교한 데이터를 제공하는 '경남 초가성비 맛집 빅데이터 전문가'입니다.
    '${city}' 지역(또는 경남 전역)에서 '${category}' 메뉴와 관련하여 1인당 7,000원 이하(최대 9,000원)의 
    실제 현지인들이 줄 서서 먹는 초가성비 식당을 최대한 많이(최소 40곳, 최대 50곳) 추천해주세요. 
    특히 창원 상남동, 마산 합성동, 진주 시내 등 주요 번화가뿐만 아니라 동네 구석구석 숨겨진 '동네 맛집'을 우선적으로 찾아줘.
    '${category}'가 '조기구이', '갈치구이', '두부조림' 같은 구체적인 메뉴일 경우 해당 메뉴를 전문으로 하거나 가성비 좋게 제공하는 곳을 우선적으로 찾아줘.
    
    단순한 식당 나열이 아니라, 다이닝코드처럼 '믿고 갈 수 있는' 검증된 곳 위주로 리스트를 작성해줘. 
    각 식당의 정확한 위도(lat)와 경도(lng) 좌표를 반드시 포함해야 하며, 
    식당의 주 메뉴에 따라 iconType을 "rice", "noodle", "meat", "soup", "bread", "fish", "tofu" 중 하나로 지정해줘.
    경남의 모든 시/군(창원, 진주, 김해, 거제, 양산 등)을 망라하여 데이터가 중복되지 않도록 주의하고, 위트 있는 추천 이유도 잊지 마.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a local budget food expert in Gyeongsangnam-do, South Korea. Always respond in Korean. Provide the output in a structured JSON format. Ensure latitude and longitude are accurate for the location.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "식당 이름" },
              price: { type: Type.STRING, description: "대표 메뉴와 가격 (예: 김치찌개 6,000원)" },
              description: { type: Type.STRING, description: "식당에 대한 간단한 설명" },
              location: { type: Type.STRING, description: "대략적인 위치 정보" },
              reason: { type: Type.STRING, description: "가성비 맛집으로 추천하는 이유 (위트 있게)" },
              lat: { type: Type.NUMBER, description: "위도" },
              lng: { type: Type.NUMBER, description: "경도" },
              iconType: { type: Type.STRING, enum: ["rice", "noodle", "meat", "soup", "bread", "fish", "tofu"], description: "식당 아이콘 타입" }
            },
            required: ["name", "price", "description", "location", "reason", "lat", "lng", "iconType"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return [];
  }
}

export async function getGeocode(restaurantName: string): Promise<{ lat: number; lng: number } | null> {
  const prompt = `경상남도에 있는 '${restaurantName}' 식당의 대략적인 위도와 경도 좌표를 찾아줘. 오직 JSON 형식으로 {"lat": 위도숫자, "lng": 경도숫자} 만 응답해줘.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["lat", "lng"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Error geocoding restaurant:", error);
    return null;
  }
}
