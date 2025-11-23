import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Order } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const specsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    outerMaterial: { type: Type.STRING, description: "Örn: Triplex, PET/ALU/PE" },
    outerWidth: { type: Type.NUMBER, description: "Genişlik cm" },
    outerHeight: { type: Type.NUMBER, description: "Yükseklik cm" },
    towelGsm: { type: Type.NUMBER, description: "Havlu gramajı" },
    essenceName: { type: Type.STRING, description: "Koku tipi" },
    suggestionReason: { type: Type.STRING, description: "Neden bu özellikler önerildi?" }
  },
  required: ["outerMaterial", "towelGsm", "essenceName"]
};

export const suggestSpecs = async (description: string): Promise<any> => {
  if (!apiKey) return null;

  try {
    const modelId = 'gemini-2.5-flash';
    const prompt = `
      Bir ıslak mendil üreticisi için satış temsilcisi asistanısın.
      Müşteri şu türde bir mendil istiyor: "${description}".
      Buna uygun teknik özellikleri (ambalaj malzemesi, ölçüler, havlu gramajı vb.) tahmin et ve öner.
      Sektör standartlarına uygun mantıklı varsayımlar yap.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: specsSchema,
        systemInstruction: "Sen uzman bir ambalaj ve kozmetik üretim danışmanısın. JSON formatında yanıt ver."
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    throw error;
  }
};

export const analyzeOrderProfitability = async (order: Order): Promise<string> => {
    if (!apiKey) return "API Anahtarı eksik.";

    try {
        const modelId = 'gemini-2.5-flash';
        // Simplify order object for prompt to save tokens
        const simpleOrder = {
            client: order.client.companyName,
            totalAmount: order.financials.totalAmount,
            currency: order.financials.currency,
            items: order.items.map(i => ({
                qty: i.quantity,
                price: i.unitPrice,
                material: i.specs.outerMaterial,
                essence: i.specs.essenceName
            }))
        };

        const orderJson = JSON.stringify(simpleOrder, null, 2);
        const prompt = `
            Aşağıdaki sipariş detaylarını incele. 
            1. Eksik veya riskli görünen bir teknik detay veya fiyatlandırma var mı?
            2. Sipariş notuna eklenmesi gereken profesyonel bir hatırlatma yaz.
            
            Sipariş Özeti:
            ${orderJson}
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });

        return response.text || "Analiz yapılamadı.";
    } catch (error) {
        console.error("AI Analysis Error:", error);
        return "Bağlantı hatası nedeniyle analiz yapılamadı.";
    }
};