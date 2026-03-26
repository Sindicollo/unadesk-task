import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Annotation } from '../../models/annotation';

interface ColorOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-annotation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annotation-panel.component.html',
  styleUrl: './annotation-panel.component.scss'
})
export class AnnotationPanelComponent {
  selectedAnnotation = input<Annotation | null>(null);
  selectedColor = input<string>('highlight_yellow');
  annotationText = input<string>('');
  isOpen = input<boolean>(false);

  colorSelected = output<string>();
  textChanged = output<string>();
  save = output<void>();
  cancel = output<void>();
  delete = output<void>();

  readonly colorOptions: ColorOption[] = [
    { value: 'highlight_yellow', label: 'Жёлтый' },
    { value: 'highlight_red', label: 'Красный' },
    { value: 'highlight_blue', label: 'Синий' },
    { value: 'highlight_green', label: 'Зелёный' },
    { value: 'highlight_purple', label: 'Фиолетовый' },
    { value: 'highlight_pink', label: 'Розовый' },
    { value: 'highlight_orange', label: 'Оранжевый' },
    { value: 'highlight_cyan', label: 'Голубой' }
  ];

  onColorSelect(color: string): void {
    this.colorSelected.emit(color);
  }

  onTextChange(text: string): void {
    this.textChanged.emit(text);
  }

  onSave(): void {
    this.save.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }

  get title(): string {
    return this.selectedAnnotation() ? 'Редактировать аннотацию' : 'Новая аннотация';
  }

  get saveButtonText(): string {
    return this.selectedAnnotation() ? 'Сохранить' : 'Создать';
  }
}
