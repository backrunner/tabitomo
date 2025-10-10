import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AISettings } from '../config/settings';
import { SUPPORTED_LANGUAGES, type LanguageCode } from './translation';

/**
 * Explain a word/sentence/grammar with pronunciation, meaning, and examples
 */
export async function* explainWord(
  word: string,
  wordLang: LanguageCode,
  explanationLang: LanguageCode,
  settings: AISettings,
  abortSignal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  console.log('[Explanation] Starting explanation');
  console.log('[Explanation] Text:', word);
  console.log('[Explanation] Text language:', wordLang);
  console.log('[Explanation] Explanation language:', explanationLang);
  console.log('[Explanation] Thinking mode:', settings.vlm.enableThinking);

  const apiKey = settings.generalAI.apiKey;
  const endpoint = settings.generalAI.endpoint;
  const modelName = settings.generalAI.modelName;

  const explanationLanguageName = SUPPORTED_LANGUAGES[explanationLang];

  // Create AI SDK client
  const client = createOpenAICompatible({
    name: 'explanation-provider',
    apiKey,
    baseURL: endpoint,
  });

  console.log('[Explanation] Sending request');

  try {
    const result = await streamText({
      model: client(modelName),
      messages: [
        {
          role: 'system',
          content: `You are a helpful language assistant that explains words, sentences, and grammar. Provide clear, concise explanations in ${explanationLanguageName}.

IMPORTANT: This is a one-time explanation request. There will be NO follow-up conversation. Provide a complete, self-contained explanation. Do NOT ask questions or suggest further discussion.

${settings.vlm.enableThinking ? 'You may include your thinking process using <think></think> tags, which will be displayed to the user.' : 'Do NOT include thinking process or reasoning. Provide only the final explanation.'}`,
        },
        {
          role: 'user',
          content: `Please explain the following text in ${explanationLanguageName}: "${word}"

This could be a word, sentence, or grammar pattern. Include relevant information such as:
1. **Type**: Word/Sentence/Grammar pattern
2. **Pronunciation**: How to pronounce it (if applicable)
3. **Meaning**: Clear definition or explanation
4. **Example**: Example sentences with translation (if applicable)
5. **Usage Notes**: Any important usage information

Format your response in markdown. Provide ONLY the explanation, no meta-commentary.`,
        },
      ],
      abortSignal,
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
              // Remove the <think> tag, but yield a marker
              yield '___THINKING_START___';
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
            } else {
              // Yield marker for thinking end
              yield '___THINKING_END___';
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

    console.log('[Explanation] Explanation completed');
  } catch (error) {
    console.error('[Explanation] Error:', error);
    throw new Error(`Explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Quick Q/A for language scenarios
 */
export async function* quickQA(
  question: string,
  questionLang: LanguageCode,
  answerLang: LanguageCode,
  settings: AISettings,
  abortSignal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  console.log('[Quick Q/A] Starting Q/A');
  console.log('[Quick Q/A] Question:', question);
  console.log('[Quick Q/A] Question language:', questionLang);
  console.log('[Quick Q/A] Answer language:', answerLang);
  console.log('[Quick Q/A] Thinking mode:', settings.vlm.enableThinking);

  const apiKey = settings.generalAI.apiKey;
  const endpoint = settings.generalAI.endpoint;
  const modelName = settings.generalAI.modelName;

  const questionLanguageName = SUPPORTED_LANGUAGES[questionLang];
  const answerLanguageName = SUPPORTED_LANGUAGES[answerLang];

  // Create AI SDK client
  const client = createOpenAICompatible({
    name: 'qa-provider',
    apiKey,
    baseURL: endpoint,
  });

  console.log('[Quick Q/A] Sending request');

  try {
    const result = await streamText({
      model: client(modelName),
      messages: [
        {
          role: 'system',
          content: `You are a helpful language assistant for travelers. Provide quick, practical answers for language scenarios in ${answerLanguageName}.

IMPORTANT: This is a one-time Q&A. There will be NO follow-up conversation. Provide a complete, actionable answer. Do NOT ask questions or suggest further discussion.

${settings.vlm.enableThinking ? 'You may include your thinking process using <think></think> tags, which will be displayed to the user.' : 'Do NOT include thinking process or reasoning. Provide only the final answer.'}`,
        },
        {
          role: 'user',
          content: `Question: "${question}"

Please provide a complete answer in ${answerLanguageName} including:
1. Direct, practical answer
2. Key phrases in ${questionLanguageName} with pronunciation guide
3. Cultural tips if relevant (brief)

Format your response in markdown. Provide ONLY the answer, no meta-commentary.`,
        },
      ],
      abortSignal,
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
              // Remove the <think> tag, but yield a marker
              yield '___THINKING_START___';
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
            } else {
              // Yield marker for thinking end
              yield '___THINKING_END___';
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

    console.log('[Quick Q/A] Q/A completed');
  } catch (error) {
    console.error('[Quick Q/A] Error:', error);
    throw new Error(`Q/A failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
