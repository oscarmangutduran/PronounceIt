import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X, Download, Upload, Copy, Check } from 'lucide-react-native';
import { WordItem } from '../../types';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onImportWords: (words: WordItem[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  words,
  onImportWords,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importJson, setImportJson] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onCloseAction?: () => void;
  } | null>(null);

  const exportString = JSON.stringify(words, null, 2);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(exportString).catch(() => {});
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        setStatusModal({
          title: 'Formato Incorrecto',
          message: 'El JSON debe ser un array o lista de palabras.',
          variant: 'warning',
        });
        return;
      }
      onImportWords(parsed);
      setStatusModal({
        title: '¡Importación Exitosa!',
        message: `Se importaron ${parsed.length} palabras correctamente a tu vocabulario.`,
        variant: 'success',
        onCloseAction: () => {
          setStatusModal(null);
          onClose();
        },
      });
    } catch {
      setStatusModal({
        title: 'Error de Formato',
        message: 'El texto ingresado no es un JSON válido. Revisa que la sintaxis sea correcta.',
        variant: 'danger',
      });
    }
  };

  return (
    <>
      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'export' && styles.tabActive]}
                onPress={() => setActiveTab('export')}
              >
                <Download size={14} color={activeTab === 'export' ? '#ffffff' : THEME.colors.textMuted} />
                <Text style={[styles.tabText, activeTab === 'export' && styles.tabTextActive]}>
                  Exportar ({words.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'import' && styles.tabActive]}
                onPress={() => setActiveTab('import')}
              >
                <Upload size={14} color={activeTab === 'import' ? '#ffffff' : THEME.colors.textMuted} />
                <Text style={[styles.tabText, activeTab === 'import' && styles.tabTextActive]}>
                  Importar
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {activeTab === 'export' ? (
              <>
                <Text style={styles.infoText}>
                  Copia los datos de tu vocabulario para guardarlos como copia de seguridad.
                </Text>
                <TextInput
                  style={styles.jsonBox}
                  value={exportString}
                  editable={false}
                  multiline
                />
              </>
            ) : (
              <>
                <Text style={styles.infoText}>
                  Pega aquí el JSON exportado para agregar o restaurar palabras.
                </Text>
                <TextInput
                  style={[styles.jsonBox, styles.inputBox]}
                  placeholder='[ { "word": "example", "translation": "ejemplo" } ]'
                  placeholderTextColor={THEME.colors.textSubtle}
                  value={importJson}
                  onChangeText={setImportJson}
                  multiline
                />
                <TouchableOpacity
                  style={styles.importActionBtn}
                  onPress={handleImport}
                >
                  <Upload size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.importActionText}>Importar Palabras</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
      />
    )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 20,
    maxHeight: '85%',
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
  body: {
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },
  jsonBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    padding: 12,
    height: 220,
    color: THEME.colors.textMuted,
    fontFamily: 'monospace',
    fontSize: 11,
    textAlignVertical: 'top',
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
    marginTop: 6,
  },
  importActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
