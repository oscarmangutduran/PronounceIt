import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { X, Download, Upload, Copy, Check, FileSpreadsheet, FolderUp } from 'lucide-react-native';
import { WordItem } from '../../types';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';
import { wordsToCsv, parseCsvToWords, exportCsvFileAsync, pickCsvFileAsync } from '../../lib/csvService';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onImportWords: (words: WordItem[]) => void;
  isDark?: boolean;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  words,
  onImportWords,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [delimiter, setDelimiter] = useState<';' | ','>(';');
  const [importCsv, setImportCsv] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onCloseAction?: () => void;
  } | null>(null);

  const exportCsvString = wordsToCsv(words, delimiter);

  const handleDownload = async () => {
    const res = await exportCsvFileAsync('pronounceit_vocabulario.csv', exportCsvString);
    if (res.success) {
      setStatusModal({
        title: '¡Exportación Exitosa!',
        message:
          res.message ||
          (Platform.OS === 'web'
            ? `Se ha descargado el archivo "pronounceit_vocabulario.csv" con ${words.length} palabras separadas en columnas individuales.`
            : `Se ha generado el archivo CSV con ${words.length} palabras. Puedes guardarlo en tus Archivos o compartirlo.`),
        variant: 'success',
      });
    } else {
      setStatusModal({
        title: 'Error de Exportación',
        message: res.message || 'No se pudo generar el archivo CSV.',
        variant: 'danger',
      });
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(exportCsvString).catch(() => {});
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePickFile = async () => {
    const res = await pickCsvFileAsync();
    if (res.success && res.content) {
      setImportCsv(res.content);
      if (res.fileName) {
        setUploadedFileName(res.fileName);
      }
    } else if (res.error) {
      setStatusModal({
        title: 'Error al abrir archivo',
        message: res.error,
        variant: 'danger',
      });
    }
  };

  const handleImport = () => {
    const trimmed = importCsv.trim();
    if (!trimmed) {
      setStatusModal({
        title: 'Archivo Vacío',
        message: 'Por favor, selecciona un archivo .csv o pega el contenido en el recuadro.',
        variant: 'warning',
      });
      return;
    }

    // Parse CSV
    let parsedWords = parseCsvToWords(trimmed);

    // Legacy fallback: if JSON is pasted instead of CSV
    if (parsedWords.length === 0 && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
      try {
        const jsonParsed = JSON.parse(trimmed);
        if (Array.isArray(jsonParsed)) {
          parsedWords = jsonParsed;
        }
      } catch {}
    }

    if (parsedWords.length === 0) {
      setStatusModal({
        title: 'Formato no reconocido',
        message:
          'No se encontraron palabras válidas en el CSV. Asegúrate de incluir columnas como "palabra" y "traduccion" (o "word" y "translation").',
        variant: 'danger',
      });
      return;
    }

    onImportWords(parsedWords);
    setStatusModal({
      title: '¡Importación Exitosa!',
      message: `Se importaron ${parsedWords.length} palabras correctamente a tu vocabulario.`,
      variant: 'success',
      onCloseAction: () => {
        setStatusModal(null);
        setImportCsv('');
        setUploadedFileName(null);
        onClose();
      },
    });
  };

  return (
    <>
      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.card, !isDark && styles.cardLight]}>
            {/* Header & Tabs */}
            <View style={styles.header}>
              <View style={[styles.tabRow, !isDark && styles.tabRowLight]}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'export' && styles.tabActive]}
                  onPress={() => setActiveTab('export')}
                  activeOpacity={0.8}
                >
                  <Download
                    size={14}
                    color={activeTab === 'export' ? '#ffffff' : (!isDark ? '#64748b' : THEME.colors.textMuted)}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      !isDark && styles.tabTextLight,
                      activeTab === 'export' && styles.tabTextActive,
                    ]}
                  >
                    Exportar CSV ({words.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, activeTab === 'import' && styles.tabActive]}
                  onPress={() => setActiveTab('import')}
                  activeOpacity={0.8}
                >
                  <Upload
                    size={14}
                    color={activeTab === 'import' ? '#ffffff' : (!isDark ? '#64748b' : THEME.colors.textMuted)}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      !isDark && styles.tabTextLight,
                      activeTab === 'import' && styles.tabTextActive,
                    ]}
                  >
                    Importar CSV
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
                <X size={18} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              style={styles.bodyScrollView}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'export' ? (
                <>
                  <View style={[styles.descriptionRow, !isDark && styles.descriptionRowLight]}>
                    <FileSpreadsheet size={18} color={THEME.colors.crimsonLight} />
                    <Text style={[styles.infoText, !isDark && styles.infoTextLight]}>
                      Cada dato se exporta en su propia columna separada (<Text style={[styles.boldText, !isDark && styles.boldTextLight]}>Columna A: palabra, B: traduccion, C: categoria...</Text>). Compatible con Excel y Google Sheets.
                    </Text>
                  </View>

                  {/* Delimiter Selector */}
                  <View style={styles.delimiterContainer}>
                    <Text style={[styles.subLabel, !isDark && styles.subLabelLight]}>Separador de Columnas:</Text>
                    <View style={styles.delimiterOptions}>
                      <TouchableOpacity
                        style={[
                          styles.delimiterPill,
                          !isDark && styles.delimiterPillLight,
                          delimiter === ';' && styles.delimiterPillActive,
                        ]}
                        onPress={() => setDelimiter(';')}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.delimiterText,
                            !isDark && styles.delimiterTextLight,
                            delimiter === ';' && styles.delimiterTextActive,
                          ]}
                        >
                          ; Punto y coma (Excel / Columnas)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.delimiterPill,
                          !isDark && styles.delimiterPillLight,
                          delimiter === ',' && styles.delimiterPillActive,
                        ]}
                        onPress={() => setDelimiter(',')}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.delimiterText,
                            !isDark && styles.delimiterTextLight,
                            delimiter === ',' && styles.delimiterTextActive,
                          ]}
                        >
                          , Coma (Estándar)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.buttonActionRow}>
                    <TouchableOpacity
                      style={styles.downloadPrimaryBtn}
                      onPress={handleDownload}
                      activeOpacity={0.85}
                    >
                      <Download size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.downloadPrimaryBtnText}>Descargar archivo .CSV</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.copyBtn,
                        !isDark && styles.copyBtnLight,
                        isCopied && styles.copyBtnSuccess,
                      ]}
                      onPress={handleCopy}
                      activeOpacity={0.85}
                    >
                      {isCopied ? (
                        <>
                          <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.copyBtnText}>¡Copiado!</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={16} color={!isDark ? '#e62e4c' : '#ffffff'} style={{ marginRight: 6 }} />
                          <Text style={[styles.copyBtnText, !isDark && styles.copyBtnTextLight]}>Copiar CSV</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.subLabel, !isDark && styles.subLabelLight]}>Vista previa del CSV generado:</Text>
                  <TextInput
                    style={[styles.csvBox, !isDark && styles.csvBoxLight]}
                    value={exportCsvString}
                    editable={false}
                    multiline
                  />
                </>
              ) : (
                <>
                  <View style={[styles.descriptionRow, !isDark && styles.descriptionRowLight]}>
                    <FolderUp size={18} color={THEME.colors.crimsonLight} />
                    <Text style={[styles.infoText, !isDark && styles.infoTextLight]}>
                      Selecciona un archivo <Text style={[styles.boldText, !isDark && styles.boldTextLight]}>.csv</Text> de tu ordenador o pega su contenido con columnas como <Text style={styles.codeText}>palabra, traduccion, categoria</Text>.
                    </Text>
                  </View>

                  {/* File Upload Selector Button */}
                  <TouchableOpacity
                    style={[styles.uploadPickerBtn, !isDark && styles.uploadPickerBtnLight]}
                    onPress={handlePickFile}
                    activeOpacity={0.85}
                  >
                    <FolderUp size={18} color={THEME.colors.crimsonLight} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.uploadPickerBtnText, !isDark && styles.uploadPickerBtnTextLight]}>
                        {uploadedFileName
                          ? `Archivo cargado: ${uploadedFileName}`
                          : 'Cargar archivo .CSV desde tu equipo'}
                      </Text>
                      <Text style={[styles.uploadPickerBtnSub, !isDark && styles.uploadPickerBtnSubLight]}>
                        {uploadedFileName ? 'Haz clic para seleccionar otro archivo' : 'Formato .csv delimitado por columnas (punto y coma o comas)'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={[styles.subLabel, !isDark && styles.subLabelLight]}>O pega el contenido CSV directamente aquí:</Text>
                  <TextInput
                    style={[styles.csvBox, styles.inputBox, !isDark && styles.csvBoxLight]}
                    placeholder={`palabra;traduccion;categoria;nivel\napple;manzana;Frutas;A1\nbreakthrough;avance decisivo;Tecnologia;B2`}
                    placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                    value={importCsv}
                    onChangeText={(val) => {
                      setImportCsv(val);
                      if (uploadedFileName) setUploadedFileName(null);
                    }}
                    multiline
                  />

                  <TouchableOpacity
                    style={styles.importActionBtn}
                    onPress={handleImport}
                    activeOpacity={0.85}
                  >
                    <Upload size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.importActionText}>Importar Palabras a Vocabulario</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Status Modal */}
      {statusModal && (
        <ConfirmModal
          isOpen={!!statusModal}
          title={statusModal.title}
          message={statusModal.message}
          confirmText="Entendido"
          cancelText={null}
          variant={statusModal.variant}
          onConfirm={() => {
            if (statusModal.onCloseAction) {
              statusModal.onCloseAction();
            } else {
              setStatusModal(null);
            }
          }}
          onCancel={() => setStatusModal(null)}
          isDark={isDark}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 10, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#161026',
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 22,
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: THEME.radius.md,
    padding: 3,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.sm,
    gap: 6,
  },
  tabActive: {
    backgroundColor: THEME.colors.crimson,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  bodyScrollView: {
    maxHeight: 520,
  },
  body: {
    gap: 12,
    paddingBottom: 4,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  boldText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  codeText: {
    color: THEME.colors.crimsonLight,
    fontFamily: 'monospace',
  },
  delimiterContainer: {
    gap: 6,
  },
  delimiterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  delimiterPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delimiterPillActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    borderColor: THEME.colors.crimson,
  },
  delimiterText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  delimiterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  downloadPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
  },
  downloadPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.md,
  },
  copyBtnSuccess: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(230, 46, 76, 0.35)',
    padding: 12,
    borderRadius: THEME.radius.md,
  },
  uploadPickerBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  uploadPickerBtnSub: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  csvBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: THEME.radius.md,
    padding: 12,
    height: 160,
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 11,
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  inputBox: {
    color: '#ffffff',
  },
  importActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    marginTop: 4,
  },
  importActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
  },
  tabRowLight: {
    backgroundColor: '#f1f5f9',
  },
  tabTextLight: {
    color: '#475569',
  },
  descriptionRowLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  infoTextLight: {
    color: '#475569',
  },
  boldTextLight: {
    color: '#0f172a',
  },
  delimiterPillLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  delimiterTextLight: {
    color: '#475569',
  },
  subLabelLight: {
    color: '#475569',
  },
  copyBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  copyBtnTextLight: {
    color: '#0f172a',
  },
  uploadPickerBtnLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  uploadPickerBtnTextLight: {
    color: '#0f172a',
  },
  uploadPickerBtnSubLight: {
    color: '#64748b',
  },
  csvBoxLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
});
