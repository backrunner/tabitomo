import OpenAI from 'openai';
import { generateObject, streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { ImageOCRSettings, AISettings } from './settings';
import { SUPPORTED_LANGUAGES, type LanguageCode } from './translation';

export interface OCRTextLocation {
  text: string;
  location?: [number, number, number, number, number, number, number, number]; // [x1, y1, x2, y2, x3, y3, x4, y4]
  rotate_rect?: [number, number, number, number, number]; // [center_x, center_y, width, height, angle]
}

/**
 * Perform OCR on image using Qwen VL OCR or custom provider
 */
export async function performOCR(
  imageBase64: string,
  settings: ImageOCRSettings
): Promise<OCRTextLocation[]> {
  console.log('[OCR API] Starting OCR with OpenAI SDK');
  console.log('[OCR API] Provider:', settings.provider);
  console.log('[OCR API] Endpoint:', settings.endpoint);
  console.log('[OCR API] Image data length:', imageBase64.length);

  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.endpoint,
    dangerouslyAllowBrowser: true,
  });

  const modelName = settings.provider === 'qwen' ? 'qwen-vl-ocr-latest' : (settings.modelName || 'qwen-vl-ocr-latest');

  const prompt = `定位所有的文字行，并按顺时针返回文本坐标位置([x1, y1, x2, y2, x3, y3, x4, y4])和旋转矩形([cx, cy, width, height, angle])的坐标结果。

请将识别结果放入words_info数组中，每个文字行对应一条结果，并且输出语言需要与图像保持一致：
只需要输出合法的JSON：
{
  "ocr_result": {
    "words_info": [
      {
        "text": "文字内容",
        "location": [x1, y1, x2, y2, x3, y3, x4, y4],
        "rotate_rect": [cx, cy, width, height, angle]
      }
    ]
  }
}`;

  console.log('[OCR API] Using model:', modelName);
  console.log('[OCR API] Sending request');

  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
              // 输入图像的最小像素阈值，小于该值图像会按原比例放大，直到总像素大于min_pixels
              min_pixels: 28 * 28 * 4,
              // 输入图像的最大像素阈值，超过该值图像会按原比例缩小，直到总像素低于max_pixels
              max_pixels: 28 * 28 * 8192,
            } as any,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    console.log('[OCR API] Response received');
    const content = completion.choices[0].message.content;
    console.log('[OCR API] Raw content:', content);

    if (!content) {
      throw new Error('Empty response from OCR API');
    }

    // Parse JSON response
    let parsedData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('[OCR Parser] Failed to parse JSON:', parseError);
      console.error('[OCR Parser] Content:', content);
      throw new Error('Failed to parse OCR response as JSON');
    }

    console.log('[OCR API] Parsed data:', JSON.stringify(parsedData, null, 2));

    // Handle various response structures
    let wordsInfo: any[];
    if (parsedData.ocr_result && Array.isArray(parsedData.ocr_result.words_info)) {
      // Standard structure: { ocr_result: { words_info: [...] } }
      wordsInfo = parsedData.ocr_result.words_info;
    } else if (Array.isArray(parsedData.words_info)) {
      // Flat structure: { words_info: [...] }
      wordsInfo = parsedData.words_info;
    } else if (Array.isArray(parsedData)) {
      // Direct array: [{ text: "...", location: [...], rotate_rect: [...] }, ...]
      wordsInfo = parsedData;
    } else if (parsedData.ocr_result && !parsedData.ocr_result.words_info) {
      // Model didn't output words_info, return empty array
      console.warn('[OCR API] No words_info in response, returning empty results');
      return [];
    } else if (typeof parsedData === 'string') {
      // Model returned plain text instead of JSON structure
      console.warn('[OCR API] Received plain text instead of structured data');
      return [];
    } else {
      console.warn('[OCR API] Unknown response structure:', parsedData);
      return [];
    }

    console.log('[OCR API] Found', wordsInfo.length, 'text regions');

    const ocrResults: OCRTextLocation[] = wordsInfo
      .filter((region: any) => region.text) // Only include regions with text
      .map((region: any, idx: number) => {
        console.log(`[OCR Parser] Text region ${idx + 1}:`, {
          text: region.text,
          location: region.location,
          rotate_rect: region.rotate_rect,
        });

        return {
          text: region.text,
          location: region.location,
          rotate_rect: region.rotate_rect,
        };
      });

    console.log('[OCR Parser] Successfully parsed', ocrResults.length, 'text regions');
    return ocrResults;
  } catch (error) {
    console.error('[OCR API] Error:', error);
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert image file to base64
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Translate image content directly using VLM
 */
export async function translateImageWithVLM(
  imageBase64: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  settings: AISettings
): Promise<string> {
  console.log('[VLM Translation] Starting VLM translation');
  console.log('[VLM Translation] Source language:', sourceLang);
  console.log('[VLM Translation] Target language:', targetLang);

  // Determine which settings to use
  const vlmConfig = settings.vlm;
  let apiKey: string;
  let endpoint: string;
  let modelName: string;

  if (vlmConfig.useGeneralAI) {
    // Use general AI settings
    apiKey = settings.generalAI.apiKey;
    endpoint = settings.generalAI.endpoint;
    modelName = settings.generalAI.modelName;
    console.log('[VLM Translation] Using General AI settings');
  } else if (vlmConfig.useCustom && vlmConfig.apiKey && vlmConfig.endpoint && vlmConfig.modelName) {
    // Use custom VLM settings
    apiKey = vlmConfig.apiKey;
    endpoint = vlmConfig.endpoint;
    modelName = vlmConfig.modelName;
    console.log('[VLM Translation] Using custom VLM settings');
  } else {
    // Use OCR settings
    apiKey = settings.imageOCR.apiKey;
    endpoint = settings.imageOCR.endpoint;
    modelName = settings.imageOCR.provider === 'qwen'
      ? 'qwen-vl-max-latest'
      : (settings.imageOCR.modelName || 'gpt-4o');
    console.log('[VLM Translation] Using OCR settings');
  }

  console.log('[VLM Translation] Endpoint:', endpoint);
  console.log('[VLM Translation] Model:', modelName);

  const sourceLanguageName = SUPPORTED_LANGUAGES[sourceLang];
  const targetLanguageName = SUPPORTED_LANGUAGES[targetLang];

  // Create AI SDK client
  const client = createOpenAICompatible({
    name: 'vlm-provider',
    apiKey,
    baseURL: endpoint,
  });

  // Translation result schema
  const translationSchema = z.object({
    translated_text: z.string().describe('The translated text content from the image, preserving line breaks and formatting'),
  });

  console.log('[VLM Translation] Sending request');

  try {
    const result = await generateObject({
      model: client(modelName),
      schema: translationSchema,
      system: `You are a professional translator specializing in image content translation. Your task is to:
1. Identify and extract all text content from the provided image
2. Translate the text from ${sourceLanguageName} to ${targetLanguageName}
3. Preserve the original formatting, line breaks, and structure
4. Maintain the tone and style of the original text
5. For any cultural references or idioms, provide natural equivalent expressions in the target language`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageBase64,
            },
            {
              type: 'text',
              text: `Please translate all text content in this image from ${sourceLanguageName} to ${targetLanguageName}. Preserve the formatting and line breaks.`,
            },
          ],
        },
      ],
    });

    console.log('[VLM Translation] Translation completed');
    console.log('[VLM Translation] Raw result:', result.object.translated_text);

    // Clean up thinking output if present
    let cleanedText = result.object.translated_text;

    // Remove <think> or <thinking> tags if present
    cleanedText = cleanedText.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleanedText = cleanedText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    // Remove markdown thinking sections (e.g., **Thinking:** or ## Thinking)
    cleanedText = cleanedText.replace(/^#+\s*thinking[\s\S]*?(?=^#+|$)/gmi, '');
    cleanedText = cleanedText.replace(/^\*\*thinking:?\*\*[\s\S]*?(?=^[^\s]|$)/gmi, '');

    // Trim extra whitespace
    cleanedText = cleanedText.trim();

    console.log('[VLM Translation] Cleaned result:', cleanedText);

    return cleanedText;
  } catch (error) {
    console.error('[VLM Translation] Error:', error);
    throw new Error(`VLM translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Translate image content directly using VLM with streaming support
 */
export async function* streamTranslateImageWithVLM(
  imageBase64: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  settings: AISettings
): AsyncGenerator<string, void, unknown> {
  console.log('[VLM Streaming] Starting VLM streaming translation');
  console.log('[VLM Streaming] Source language:', sourceLang);
  console.log('[VLM Streaming] Target language:', targetLang);
  console.log('[VLM Streaming] Thinking mode:', settings.vlm.enableThinking);

  // Determine which settings to use
  const vlmConfig = settings.vlm;
  let apiKey: string;
  let endpoint: string;
  let modelName: string;

  if (vlmConfig.useGeneralAI) {
    // Use general AI settings
    apiKey = settings.generalAI.apiKey;
    endpoint = settings.generalAI.endpoint;
    modelName = settings.generalAI.modelName;
    console.log('[VLM Streaming] Using General AI settings');
  } else if (vlmConfig.useCustom && vlmConfig.apiKey && vlmConfig.endpoint && vlmConfig.modelName) {
    // Use custom VLM settings
    apiKey = vlmConfig.apiKey;
    endpoint = vlmConfig.endpoint;
    modelName = vlmConfig.modelName;
    console.log('[VLM Streaming] Using custom VLM settings');
  } else {
    // Use OCR settings
    apiKey = settings.imageOCR.apiKey;
    endpoint = settings.imageOCR.endpoint;
    modelName = settings.imageOCR.provider === 'qwen'
      ? 'qwen-vl-max-latest'
      : (settings.imageOCR.modelName || 'gpt-4o');
    console.log('[VLM Streaming] Using OCR settings');
  }

  console.log('[VLM Streaming] Endpoint:', endpoint);
  console.log('[VLM Streaming] Model:', modelName);

  const sourceLanguageName = SUPPORTED_LANGUAGES[sourceLang];
  const targetLanguageName = SUPPORTED_LANGUAGES[targetLang];

  // Create AI SDK client
  const client = createOpenAICompatible({
    name: 'vlm-provider',
    apiKey,
    baseURL: endpoint,
  });

  console.log('[VLM Streaming] Sending request');

  try {
    const result = await streamText({
      model: client(modelName),
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in image content translation. Your task is to:
1. Identify and extract all text content from the provided image
2. Translate the text from ${sourceLanguageName} to ${targetLanguageName}
3. Preserve the original formatting, line breaks, and structure
4. Maintain the tone and style of the original text
5. For any cultural references or idioms, provide natural equivalent expressions in the target language
${settings.vlm.enableThinking ? '\n6. You may include your thinking process using <think></think> tags, which will be displayed to the user.' : '\n6. Do NOT include thinking process or reasoning. Provide only the final translation.'}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageBase64,
            },
            {
              type: 'text',
              text: `Please translate all text content in this image from ${sourceLanguageName} to ${targetLanguageName}. Preserve the formatting and line breaks.`,
            },
          ],
        },
      ],
    });

    let inThinkTag = false;
    let buffer = '';

    for await (const chunk of result.textStream) {
      // Filter out GLM box tokens
      const filteredChunk = chunk
        .replace(/<\|begin_of_box\|>/g, '')
        .replace(/<\|end_of_box\|>/g, '');

      buffer += filteredChunk;

      // Process buffer to handle think tags
      while (true) {
        if (!inThinkTag) {
          const thinkStartIndex = buffer.indexOf('<think>');
          if (thinkStartIndex === -1) {
            // No think tag found, yield everything except potential incomplete tag at the end
            const lastTagStart = buffer.lastIndexOf('<');
            if (lastTagStart === -1 || lastTagStart === 0) {
              // No potential tag start, yield everything
              if (buffer.length > 0) {
                yield buffer;
                buffer = '';
              }
              break;
            } else {
              // Might be a partial tag, yield everything before it
              const toYield = buffer.substring(0, lastTagStart);
              if (toYield.length > 0) {
                yield toYield;
              }
              buffer = buffer.substring(lastTagStart);
              break;
            }
          } else {
            // Found think tag start
            if (thinkStartIndex > 0) {
              // Yield content before think tag
              yield buffer.substring(0, thinkStartIndex);
            }
            buffer = buffer.substring(thinkStartIndex);
            inThinkTag = true;

            if (!settings.vlm.enableThinking) {
              // Remove the <think> tag
              buffer = buffer.substring(7); // Remove '<think>'
            } else {
              // Keep the tag and yield it
              yield '<think>';
              buffer = buffer.substring(7);
            }
          }
        } else {
          const thinkEndIndex = buffer.indexOf('</think>');
          if (thinkEndIndex === -1) {
            // No end tag yet
            if (settings.vlm.enableThinking) {
              // Yield the content inside think tags
              yield buffer;
            }
            // Otherwise, skip it (don't yield)
            buffer = '';
            break;
          } else {
            // Found end tag
            if (settings.vlm.enableThinking) {
              // Yield content and end tag
              yield buffer.substring(0, thinkEndIndex + 8); // Include '</think>'
            }
            // Skip the content inside think tags
            buffer = buffer.substring(thinkEndIndex + 8);
            inThinkTag = false;
          }
        }
      }
    }

    // Handle any remaining buffer
    if (buffer.length > 0 && (!inThinkTag || settings.vlm.enableThinking)) {
      yield buffer;
    }

    console.log('[VLM Streaming] Translation completed');
  } catch (error) {
    console.error('[VLM Streaming] Error:', error);
    throw new Error(`VLM streaming translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

