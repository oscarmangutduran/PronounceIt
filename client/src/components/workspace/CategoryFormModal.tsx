import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Folder, Layers, Sparkles, Plus, Pin } from 'lucide-react-native';
import { THEME } from '../../theme';

export type CategoryFormMode =
  | 'create_category'
  | 'edit_category'
  | 'create_subcategory'
  | 'edit_subcategory';

interface CategoryFormModalProps {
  isOpen: boolean;
  mode: CategoryFormMode;
  initialValue?: string;
  initialSubcategories?: string[];
  categoryName?: string;
  isDark?: boolean;
  onClose: () => void;
  onSubmit: (name: string, subcategories?: string[]) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  mode,
  initialValue = '',
  initialSubcategories = [],
  categoryName,
  isDark = true,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subInput, setSubInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubFocused, setIsSubFocused] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialValue);
      setSubcategories(initialSubcategories ? [...initialSubcategories] : []);
      setSubInput('');
      setError(null);
    }
  }, [isOpen, initialValue, initialSubcategories]);

  if (!isOpen) return null;

  const isSubcategory = mode === 'create_subcategory' || mode === 'edit_subcategory';
  const isEditing = mode === 'edit_category' || mode === 'edit_subcategory';
  const isCreatingCategory = mode === 'create_category';
  const allowsSubcategories = isCreatingCategory || mode === 'edit_category';

  const title = isEditing
    ? isSubcategory
      ? 'Editar Subcategoría'
      : 'Editar Categoría'
    : isSubcategory
    ? ('Nueva Subcategoría en "' + (categoryName || 'Categoría') + '"')
    : 'Nueva Categoría';

  const subtitle = isEditing
    ? 'Cambiar el nombre actualizará automáticamente todas las palabras asociadas.'
    : isSubcategory
    ? 'Organiza términos específicos dentro de este temario principal.'
    : 'Crea una categoría y sus subcategorías asociadas para estructurar tu vocabulario.';

  const placeholder = isSubcategory
    ? 'Ej: Phrasal Verbs, Familia, Comida, Viajes...'
    : 'Ej: Gramática, Negocios, Lecturas, Coloquial...';

  const handleAddSubcategoryChip = () => {
    const trimmed = subInput.trim();
    if (!trimmed) return;
    if (subcategories.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSubInput('');
      return;
    }
    setSubcategories((prev) => [...prev, trimmed]);
    setSubInput('');
  };

  const handleRemoveSubcategoryChip = (subToRemove: string) => {
    setSubcategories((prev) => prev.filter((s) => s.toLowerCase() !== subToRemove.toLowerCase()));
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(
        isSubcategory
          ? 'Por favor ingresa un nombre para la subcategoría.'
          : 'Por favor ingresa un nombre para la categoría.'
      );
      return;
    }
    if (allowsSubcategories) {
      const finalSubs = [...subcategories];
      const pendingSub = subInput.trim();
      if (pendingSub && !finalSubs.some((s) => s.toLowerCase() === pendingSub.toLowerCase())) {
        finalSubs.push(pendingSub);
      }
      onSubmit(trimmed, finalSubs);
    } else {
      onSubmit(trimmed);
    }
    onClose();
  };

  // Preview elements
  const effectiveCategoryName = name.trim() || (isCreatingCategory ? 'Nueva Categoría' : 'Categoría');
  const previewSubs = [...subcategories];
  if (subInput.trim() && !previewSubs.some((s) => s.toLowerCase() === subInput.trim().toLowerCase())) {
    previewSubs.push(subInput.trim() + ' (nueva)');
  }

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, !isDark && styles.cardLight]}>
          <View style={[styles.header, !isDark && styles.headerLight]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, !isDark && styles.iconCircleLight]}>
                {isSubcategory ? (
                  <Layers size={18} color="#e62e4c" />
                ) : (
                  <Folder size={18} color="#e62e4c" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, !isDark && styles.titleLight]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.subtitle, !isDark && styles.subtitleLight]}>
                  {subtitle}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, !isDark && styles.closeBtnLight]}>
              <X size={18} color={!isDark ? "#64748b" : THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Category or Subcategory Name Input */}
            <View>
              <Text style={[styles.label, !isDark && styles.labelLight]}>
                {isSubcategory ? 'Nombre de la subcategoría *' : 'Nombre de la categoría principal *'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  !isDark && styles.inputLight,
                  isFocused && (isDark ? styles.inputFocused : styles.inputFocusedLight),
                  !!error && styles.inputError,
                ]}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError(null);
                }}
                placeholder={placeholder}
                placeholderTextColor={!isDark ? "#94a3b8" : THEME.colors.textSubtle}
                autoFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onSubmitEditing={allowsSubcategories ? undefined : handleSubmit}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Subcategories creation & association section */}
            {allowsSubcategories && (
              <View style={[styles.subSection, !isDark && styles.subSectionLight]}>
                <View style={styles.subSectionHeader}>
                  <View style={styles.subSectionHeaderLeft}>
                    <Layers size={15} color="#e62e4c" />
                    <Text style={[styles.subSectionTitle, !isDark && styles.subSectionTitleLight]}>
                      Subcategoría asociada (opcional)
                    </Text>
                  </View>
                  {subcategories.length > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>
                        {subcategories.length} {subcategories.length === 1 ? 'asociada' : 'asociadas'}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.subSectionDesc, !isDark && styles.subSectionDescLight]}>
                  {name.trim()
                    ? `La subcategoría que añadas quedará vinculada directamente a «${name.trim()}».`
                    : 'Puedes crear una o más subcategorías asociadas a esta nueva categoría principal.'}
                </Text>

                <View style={styles.subInputRow}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.subInput,
                      !isDark && styles.inputLight,
                      isSubFocused && (isDark ? styles.inputFocused : styles.inputFocusedLight),
                    ]}
                    value={subInput}
                    onChangeText={setSubInput}
                    placeholder="Ej: Phrasal Verbs, Familia, Finanzas, Comida..."
                    placeholderTextColor={!isDark ? "#94a3b8" : THEME.colors.textSubtle}
                    onFocus={() => setIsSubFocused(true)}
                    onBlur={() => setIsSubFocused(false)}
                    onSubmitEditing={handleAddSubcategoryChip}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addSubBtn,
                      !subInput.trim() && styles.addSubBtnDisabled,
                    ]}
                    onPress={handleAddSubcategoryChip}
                    disabled={!subInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color="#ffffff" />
                    <Text style={styles.addSubBtnText}>Añadir</Text>
                  </TouchableOpacity>
                </View>

                {/* Subcategory Chips List */}
                {subcategories.length > 0 && (
                  <View style={styles.chipsContainer}>
                    {subcategories.map((sub) => (
                      <View
                        key={sub}
                        style={[styles.subChip, !isDark && styles.subChipLight]}
                      >
                        <Pin size={11} color="#e62e4c" />
                        <Text style={[styles.subChipText, !isDark && styles.subChipTextLight]}>
                          {sub}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveSubcategoryChip(sub)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <X size={12} color={!isDark ? "#e11d48" : "#ff758c"} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Live Hierarchy Tree Preview */}
                {(name.trim().length > 0 || previewSubs.length > 0) && (
                  <View style={[styles.previewBox, !isDark && styles.previewBoxLight]}>
                    <Text style={[styles.previewTitle, !isDark && styles.previewTitleLight]}>
                      Estructura que se creará:
                    </Text>
                    <View style={styles.previewTree}>
                      <View style={styles.previewCategoryRow}>
                        <Folder size={14} color="#e62e4c" />
                        <Text style={[styles.previewCategoryText, !isDark && styles.previewCategoryTextLight]}>
                          {effectiveCategoryName}
                        </Text>
                        <View style={styles.previewBadgeCategory}>
                          <Text style={styles.previewBadgeCategoryText}>Categoría</Text>
                        </View>
                      </View>

                      {previewSubs.length > 0 ? (
                        previewSubs.map((sub, idx) => (
                          <View key={idx} style={styles.previewSubRow}>
                            <View style={styles.previewBranchLine} />
                            <Pin size={11} color="#38bdf8" />
                            <Text style={[styles.previewSubText, !isDark && styles.previewSubTextLight]}>
                              {sub}
                            </Text>
                            <View style={styles.previewBadgeSub}>
                              <Text style={styles.previewBadgeSubText}>Subcategoría asociada</Text>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.previewSubRow}>
                          <View style={styles.previewBranchLine} />
                          <Text style={[styles.previewEmptySubText, !isDark && styles.previewEmptySubTextLight]}>
                            (Sin subcategorías aún)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, !isDark && styles.footerLight]}>
            <TouchableOpacity
              style={[styles.cancelBtn, !isDark && styles.cancelBtnLight]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelBtnText, !isDark && styles.cancelBtnTextLight]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Sparkles size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>
                {isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    backgroundColor: "#161026",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(230, 46, 76, 0.25)",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  cardLight: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(230, 46, 76, 0.2)",
    shadowColor: "#64748b",
    shadowOpacity: 0.15,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    gap: 12,
  },
  headerLight: {
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(230, 46, 76, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleLight: {
    backgroundColor: "rgba(230, 46, 76, 0.1)",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  titleLight: {
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  subtitleLight: {
    color: "#64748b",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnLight: {
    backgroundColor: "#f1f5f9",
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.textMuted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelLight: {
    color: "#475569",
  },
  input: {
    backgroundColor: "#0f0c18",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#ffffff",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  inputLight: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    color: "#0f172a",
  },
  inputFocused: {
    borderColor: "#e62e4c",
    backgroundColor: "#130d20",
  },
  inputFocusedLight: {
    borderColor: "#e62e4c",
    backgroundColor: "#ffffff",
  },
  inputError: {
    borderColor: "#f87171",
  },
  errorText: {
    fontSize: 11,
    color: "#f87171",
    marginTop: 6,
    fontWeight: "500",
  },
  subSection: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    gap: 10,
  },
  subSectionLight: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  subSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subSectionTitleLight: {
    color: "#1e293b",
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(230, 46, 76, 0.15)",
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e62e4c",
  },
  subSectionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
  subSectionDescLight: {
    color: "#64748b",
  },
  subInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
  },
  addSubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e62e4c",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addSubBtnDisabled: {
    opacity: 0.5,
  },
  addSubBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(230, 46, 76, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(230, 46, 76, 0.3)",
  },
  subChipLight: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
  },
  subChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  subChipTextLight: {
    color: "#9f1239",
  },
  previewBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  previewBoxLight: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  previewTitleLight: {
    color: "#64748b",
  },
  previewTree: {
    gap: 6,
  },
  previewCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewCategoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  previewCategoryTextLight: {
    color: "#0f172a",
  },
  previewBadgeCategory: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(230, 46, 76, 0.15)",
  },
  previewBadgeCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#e62e4c",
  },
  previewSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 14,
  },
  previewBranchLine: {
    width: 8,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  previewSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  previewSubTextLight: {
    color: "#334155",
  },
  previewEmptySubText: {
    fontSize: 11,
    fontStyle: "italic",
    color: THEME.colors.textSubtle,
  },
  previewEmptySubTextLight: {
    color: "#94a3b8",
  },
  previewBadgeSub: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  previewBadgeSubText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#38bdf8",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  footerLight: {
    backgroundColor: "#f8fafc",
    borderTopColor: "#f1f5f9",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  cancelBtnLight: {
    backgroundColor: "#e2e8f0",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.textMuted,
  },
  cancelBtnTextLight: {
    color: "#475569",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#e62e4c",
    shadowColor: "#e62e4c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
});