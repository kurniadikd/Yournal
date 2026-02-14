// composables/useNarrative.js
// Composable for narrative API interactions

import { ref } from 'vue';
import { api, API_BASE_URL } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';

export function useNarrative() {
  const isLoading = ref(false);
  const error = ref(null);


  /**
   * Fetch narrative for a sentence group (Admin)
   * Refactored to use /admin/narration/{id}
   * @param {number} groupId - Sentence group ID
   * @returns {Promise<any>}
   */
  async function fetchNarrative(id: number): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      let narrativeId: number | null = null;
      
      // If ID is high (likely a group ID) or we want to be safe, resolve it
      // Standard narrative IDs are usually serial, group IDs are also serial.
      // But in this app, if we pass a positive ID, it might be a Group ID.
      // To keep URLs clean, we always try to find the narrative for the group first.
      const searchRes = await api.get('/admin/narration', { 
          params: { sentence_group_id: Math.floor(id), page_size: 1 } 
      });
      
      if (searchRes.data.results && searchRes.data.results.length > 0) {
          narrativeId = searchRes.data.results[0].id;
      } else {
          // Maybe it was already a narrative ID? Let's try direct fetch as fallback
          narrativeId = id;
      }

      const response = await api.get(`/admin/narration/${narrativeId}`);
      return { ...response.data, exists: true };
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
           return { exists: false };
      }
      error.value = err.message || 'Failed to fetch narrative';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetch public narrative (read-only)
   * Refactored to use /public/narration/{id}
   * @param {number} groupId - Sentence group ID
   * @returns {Promise<any>}
   */
  async function fetchPublicNarrative(id: number): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      let narrativeId: number | null = null;

      // Public resolution: search for the narrative by group ID
      const searchRes = await api.get('/public/narratives', { 
          params: { sentence_group_id: Math.floor(id), page_size: 1 } 
      });

      if (searchRes.data.results && searchRes.data.results.length > 0) {
          narrativeId = searchRes.data.results[0].id;
      } else {
          narrativeId = id; // Fallback to direct ID
      }

      const response = await api.get(`/public/narration/${narrativeId}`);
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Narrative not found';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function searchNarratives(query: string, page: number = 1): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/public/narratives', {
        params: { q: query, page },
      });
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to search narratives';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Generate narrative using AI
   * @param {number} groupId - Sentence group ID
   * @param {boolean} preview - If true, do not save to DB (default false)
   * @param {object|null} aiConfig - Optional AI configuration
   * @returns {Promise<any>}
   */
  async function generateNarrative(groupId: number, preview: boolean = false, aiConfig: any = null): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      // Determine if we are creating or updating
      // Logic: Logic is handled by handle_narrative_patch which supports both.
      // If we don't have ID, we use POST /admin/narration
      // But generating usually implies we might not know ID yet or we do.
      // Since generateNarrative caller usually passes groupId, 
      // we need to resolve ID *if* it exists to be safe? 
      // ACTUALLY: handle_narrative_patch can resolve by group_id if provided!
      // But wait, my handle_narrative_patch logic:
      // "let mut narrative_id = path_narrative_id.or(payload.narrative_id);"
      // "if let Some(nid) = cid { ... } else if let Some(gid) = sentence_group_id { ... }"
      // So if I pass sentence_group_id in payload, it can handle it.
      
      // So I can just call POST /admin/narration with { sentence_group_id: ... }
      // This creates or updates (upsert logic in DB).
      
      const payload: any = {
          action: 'generate',
          preview,
          ai_config: aiConfig,
          sentence_group_id: groupId > 0 ? Math.floor(groupId) : null
      };

      console.log("[AI Narrative] Generate Request:", payload);
      const response = await api.post('/admin/narration', payload);
      console.log("[AI Narrative] Generate Response:", response.data);
      return response.data;
    } catch (err: any) {
      console.error("[AI Narrative] Generate Error:", err);
      error.value = err.message || 'Failed to generate narrative';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Save narrative content manually
   * @param {number} groupId - Sentence group ID
   * @param {object} contents - { langCode: { title, content }, ... }
   * @param {number} narrativeId - Optional narrative ID
   * @param {string} status - Narrative status
   * @param {object} metadata - Optional metadata
   * @returns {Promise<any>}
   */
  async function saveNarrative(
    groupId: number | null,
    contents: any,
    narrativeId: number | null = null,
    status: string = 'draft',
    metadata: any = null,
    images: any[] = [] // [NEW] Accept images
  ): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const payload: any = { 
        contents,
        narrative_id: narrativeId ? Math.floor(narrativeId) : null, 
        sentence_group_id: (groupId && groupId > 0) ? Math.floor(groupId) : null,
        status: status,
        metadata: metadata,
        images: images // [NEW] Include images
      };
      
      console.log("[AI Narrative] Save Request:", payload);
      let response;
      if (narrativeId) {
          response = await api.patch(`/admin/narration/${narrativeId}`, payload);
      } else {
          // Create new
          response = await api.post('/admin/narration', payload);
      }
      console.log("[AI Narrative] Save Response:", response.data);
      return response.data;
    } catch (err: any) {
      console.error("[AI Narrative] Save Error:", err);
      error.value = err.message || 'Failed to save narrative';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteNarrative(idParam: number, isNarrativeId: boolean = false): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      // Determine ID. 
      // If logic in component sends negative for Standalone, we extract it.
      // If positive, it was GroupID?
      // Backend now expects NARRATIVE ID.
      
      let narrativeId: number | null = null;
      
      if (isNarrativeId && idParam > 0) {
           // Explicit Narrative ID passed, use directly
           narrativeId = idParam;
      } else if (idParam > 0) {
           // Assume it's a Group ID, search for narrative
           const searchRes = await api.get('/admin/narration', { 
              params: { sentence_group_id: Math.floor(idParam), page_size: 1 } 
           });
           if (searchRes.data.results && searchRes.data.results.length > 0) {
              narrativeId = searchRes.data.results[0].id;
           } else {
              narrativeId = idParam; // Fallback: Assume it's a direct Narrative ID
           }
      }
      
      if (!narrativeId) {
           throw new Error("Narrative not found for deletion");
      }

      await api.delete(`/admin/narration/${narrativeId}`);
      return true;
    } catch (err: any) {
      // If 404, it's already deleted, so treat as success
      if (err.response && err.response.status === 404) {
          console.warn("Narrative already deleted (404), treating as success.");
          return true;
      }
      error.value = err.message || 'Failed to delete narrative';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get AI Director Plan (Story Outline)
   * @param {number} groupId 
   * @returns {Promise<object|null>}
   */
  async function getDirectorPlan(groupId: number, aiConfig: any = null): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
       // Resolve ID
       let narrativeId: number | null = null;
        if (groupId > 0) {
              const searchRes = await api.get('/admin/narration', { 
                  params: { sentence_group_id: Math.floor(groupId), page_size: 1 } 
              });
              if (searchRes.data.results && searchRes.data.results.length > 0) {
                  narrativeId = searchRes.data.results[0].id;
              } else {
                  narrativeId = groupId; // Direct ID?
              }
        }
        
      if (!narrativeId) {
          // If no narrative, we might just want to plan based on Group sentences?
          // But backend expects narrative_id.
          // We can't resolve sentences if we don't know group?
          // If we have groupId, we can fetch sentences.
          // But route is /admin/narration/{id}/plan.
          // Backend code for plan: fetches narrative by ID.
          // If narrative doesn't exist, we can't run plan?
          // Wait, backend code logic: "get_narrative_by_id".
          // So Narrative MUST exist.
          // This means we might need to Auto-Create a draft narrative before planning?
          // Or I should have allowed /admin/sentence-groups/{id}/plan? 
          // I removed it.
          // WORKAROUND: Create empty narrative first?
          // Or Update Backend to allow using `group_id` for plan?
          // For now, assume it fails if no narrative.
           throw new Error("Please save the narrative draft before generating a plan.");
      }

      console.log("[AI Narrative] Plan Request:", { narrativeId, aiConfig });
      const response = await api.post(`/admin/narration/${narrativeId}/plan`, aiConfig);
      console.log("[AI Narrative] Plan Response:", response.data);
      return response.data;
    } catch (err: any) {
      console.error("[AI Narrative] Plan Error:", err);
      error.value = err.message || 'Failed to get director plan';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading,
    error,
    fetchNarrative,
    fetchPublicNarrative,
    generateNarrative,
    saveNarrative,
    deleteNarrative,
    searchNarratives,
    getDirectorPlan, 
  };
}

export interface GenerateOptions {
  onLanguageStart?: (lang: string, label: string) => void;
  onLanguageSuccess?: (lang: string, content: any, narrativeId?: number, validationPassed?: boolean, validationErrors?: any[], images?: any[]) => void;
  onLanguageError?: (lang: string, message: string) => void;
  onComplete?: (success: number, error: number) => void;
  aiConfig?: any;
  targetLanguages?: string[];
  baseSentences?: Record<string, string>;
  storyOutline?: any;
  skipBaseGeneration?: boolean;
  feedback?: any;
  narrativeId?: number | null; // For standalone translations
  baseLang?: string; // Explicit base language override
  baseContent?: any; // Editorial content (title + paragraphs) for translation source
}

export function generateNarrativeParallel(groupId: number, options: GenerateOptions = {}) {
  const {
    onLanguageStart = () => {},
    onLanguageSuccess = () => {},
    onLanguageError = () => {},
    onComplete = () => {},
    aiConfig = null,
    targetLanguages = [], 
    baseSentences = {}, 
    storyOutline = null, // Optional Director Plan
  } = options;

  let isAborted = false;
  const abort = () => { isAborted = true; };

  // Initialized counters to fix ReferenceError
  let successCount = 0;
  let errorCount = 0;

  async function run() {
    // Single declaration of baseLang, available to entire scope
    const hasBaseSentences = Object.keys(baseSentences).length > 0;
    // Pioritize explicit baseLang (from UI), then anchor logic, then default 'en'
    const baseLang = options.baseLang || (hasBaseSentences 
      ? (baseSentences.en ? 'en' : (baseSentences.ru ? 'ru' : (baseSentences.id ? 'id' : Object.keys(baseSentences)[0])))
      : 'en');

    try {
      if (isAborted) return;

      // Track narrative_id for standalone mode (needed for translations)
      // Use from options if provided (for regeneration), otherwise will be set after base generation
      let narrativeId: number | null = options.narrativeId ?? null;
      let baseContent: any = null;

      // 2. Generate Base Narrative (unless skipped)
      if (!options.skipBaseGeneration) {
          onLanguageStart(baseLang, 'Base Narrative');

          // Ensure options.feedback is safe
          const safeFeedback = options.feedback && typeof options.feedback === 'string' ? options.feedback : null;

          const payload: any = {
            action: 'generate_base',
            ai_config: aiConfig,
            preview: true, // [NEW] Always preview first
            feedback: safeFeedback,
            provided_outline: storyOutline, // Pass outline
            base_lang: baseLang, // Pass explicit base language
            sentence_group_id: (groupId && groupId > 0) ? groupId : null,
            narrative_id: narrativeId // Pass if exists
          };

          console.log("[AI Narrative] Parallel-Base Request:", payload);
          let baseRes;
          if (narrativeId) {
             baseRes = await api.patch(`/admin/narration/${narrativeId}`, payload);
          } else {
             // Create New or Upsert via POST
             baseRes = await api.post('/admin/narration', payload);
          }

          console.log("[AI Narrative] Parallel-Base Response:", baseRes.data);
          
          if (isAborted) return;

          const narrative = baseRes.data;
          narrativeId = narrative.id; // Capture for translations
          baseContent = narrative.contents[baseLang];
          
          if (baseContent) {
            onLanguageSuccess(baseLang, baseContent, narrative.id, undefined, undefined, narrative.images);
            successCount++;
          } else {
            throw new Error("Base content not returned from backend");
          }
      } else {
          // If we skipped base generation, we MUST have a narrativeId
           // But if caller didn't provide one, and we are standalone, we might be in trouble IF the narrative doesn't exist yet.
           // However, skipBaseGeneration is usually used for regenerating SPECIFIC languages on an EXISTING narrative.
           if (!narrativeId && groupId > 0) {
              // Try to resolve ID if group exists
               const searchRes = await api.get('/admin/narration', { 
                  params: { sentence_group_id: groupId, page_size: 1 } 
               });
               if (searchRes.data.results && searchRes.data.results.length > 0) {
                  narrativeId = searchRes.data.results[0].id;
               }
           }
      }

      if (!narrativeId) {
          throw new Error("Cannot generate translations without a base narrative ID.");
      }

      // 3. Trigger Parallel Tasks (Translations)
      const tasks = [];

      // Translations
      const safeTargetLanguages = targetLanguages.length > 0 ? targetLanguages : [];
      const translationTargets = safeTargetLanguages.filter(l => l !== baseLang);
      
      translationTargets.forEach(lang => {
          tasks.push((async () => {
              if (isAborted) return;
              onLanguageStart(lang, lang); 
              
              const safeFeedback = options.feedback && typeof options.feedback === 'string' ? options.feedback : null;

              try {
                  const payload: any = {
                      action: 'translate',
                      target_lang: lang,
                      base_lang: baseLang, // [RESTORE] Ensure anchor sync
                      preview: true, // [NEW] Always preview
                      feedback: safeFeedback,
                      narrative_id: narrativeId,
                      contents: (options.baseContent || baseContent) ? { 
                          [baseLang]: { 
                              title: (options.baseContent || baseContent).title, 
                              // Only send text paragraphs to backend for translation
                              content: ((options.baseContent || baseContent).paragraphs || (options.baseContent || baseContent).content || [])
                                  .filter((p: string) => typeof p === 'string' && !p.trim().startsWith('[IMG:'))
                          } 
                      } : undefined
                  };

                  console.log(`[AI Narrative] Parallel-Translate [${lang}] Request:`, payload);
                  const tRes = await api.patch(`/admin/narration/${narrativeId}`, payload);
                  console.log(`[AI Narrative] Parallel-Translate [${lang}] Response:`, tRes.data);
                  if (isAborted) return;
                  
                  const tData = tRes.data;
                  const tContent = tData.contents[lang];
                  
                  if (tContent) {
                      // Pass validation data to callback for frontend retry decision
                      onLanguageSuccess(lang, tContent, undefined, tData.validation_passed, tData.validation_errors, tData.images);
                      successCount++;
                  } else {
                      throw new Error("Translation content missing");
                  }
              } catch (err) {
                  if (!isAborted) {
                      errorCount++;
                      onLanguageError(lang, err.response?.data?.error || err.message);
                  }
              }
          })());
      });

      // Wait for all to finish
      await Promise.all(tasks);

      if (!isAborted) {
        onComplete(successCount, errorCount);
      }

    } catch (err) {
      if (!isAborted) {
         errorCount++;
         onLanguageError(baseLang, err.response?.data?.error || err.message);
         onComplete(successCount, errorCount);
      }
    }
  }

  run();

  return abort;
}
