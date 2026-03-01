import Image from '@tiptap/extension-image'

export const SelectableImage = Image.extend({
  name: 'selectableImage',
  
  // Important: inline to allow text-align. draggable to allow moving.
  inline: true,
  group: 'inline',
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      isLoading: {
        default: false,
        parseHTML: element => element.getAttribute('data-is-loading') === 'true',
        renderHTML: attributes => {
          if (!attributes.isLoading) return {}
          return { 'data-is-loading': 'true' }
        },
      },
      uploadId: {
        default: null,
      },
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('span')
      container.classList.add('selectable-image-wrapper')
      // Ensure the container clips the blurred image so edges remain sharp
      container.style.position = 'relative'
      container.style.display = 'inline-block'
      container.style.overflow = 'hidden'
      container.style.borderRadius = '12px' // Match standard rounded-xl
      container.style.border = '1px solid color-mix(in srgb, var(--color-outline-variant), transparent 50%)'
      container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      
      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.title = node.attrs.title || ''
      // Add standard transform to fix blurring bleeding at the extreme edges by scaling it up slightly
      img.style.transition = 'all 0.4s ease-in-out'
      img.style.display = 'block'
      
      let spinner: HTMLDivElement | null = null;

      const applyLoadingState = (isLoading: boolean) => {
        if (isLoading) {
          img.style.filter = 'blur(12px) brightness(0.7)';
          img.style.opacity = '0.8';
          img.style.transform = 'scale(1.05)'; // Scale up slightly to hide blur edge bleeding
          
          if (!spinner) {
            spinner = document.createElement('div');
            // Solid spinner container to ensure it stands out clearly
            spinner.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-300 z-10';
            spinner.innerHTML = `
              <div class="bg-[var(--color-surface-container-high)]/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-[var(--color-outline-variant)]/30 flex items-center justify-center">
                <span class="loading loading-spinner loading-md text-[var(--color-primary)]"></span>
              </div>
            `;
            container.appendChild(spinner);
          }
        } else {
          img.style.filter = 'none';
          img.style.opacity = '1';
          img.style.transform = 'scale(1)';
          
          if (spinner) {
            spinner.style.opacity = '0';
            setTimeout(() => {
              if (spinner && spinner.parentNode) {
                spinner.parentNode.removeChild(spinner);
              }
              spinner = null;
            }, 300);
          }
        }
      };

      applyLoadingState(node.attrs.isLoading);
      
      let wasSelectedOnMousedown = false;

      img.addEventListener('mousedown', () => {
        wasSelectedOnMousedown = container.classList.contains('ProseMirror-selectednode')
      })

      img.addEventListener('click', (e) => {
        // Only trigger preview if it was already selected before the click started
        if (wasSelectedOnMousedown && container.classList.contains('ProseMirror-selectednode')) {
          e.preventDefault()
          e.stopPropagation()
          const event = new CustomEvent('preview-image', { 
            detail: { src: node.attrs.src },
            bubbles: true 
          })
          container.dispatchEvent(event)
        }
      })

      const btn = document.createElement('button')
      btn.className = 'image-delete-btn'
      btn.innerHTML = '<span class="material-symbols-rounded">close</span>'
      btn.contentEditable = 'false'
      
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (typeof getPos === 'function') {
          const pos = getPos()
          if (typeof pos === 'number') {
            // Delete the node
            editor.commands.deleteRange({ from: pos, to: pos + 1 })
            editor.commands.focus()
          }
        }
      })

      container.append(img, btn)

      const onSelectionUpdate = () => {
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        
        const { selection } = editor.state
        // Check if node is directly selected or inside a range selection (block cursor)
        const isNodeSelected = (selection as any).node === node
        const isInsideRange = selection.from <= pos && selection.to >= pos + node.nodeSize
        
        if (isNodeSelected || isInsideRange) {
          container.classList.add('ProseMirror-selectednode')
        } else {
          container.classList.remove('ProseMirror-selectednode')
        }
      }

      editor.on('selectionUpdate', onSelectionUpdate)

      return {
        dom: container,
        selectNode: () => {
             container.classList.add('ProseMirror-selectednode')
        },
        deselectNode: () => {
             // Only remove if it's not actually inside a range selection
             onSelectionUpdate()
        },
        update: (updatedNode) => {
            if (updatedNode.type !== this.type) return false
            if (updatedNode.attrs.src !== img.src) img.src = updatedNode.attrs.src
            
            applyLoadingState(updatedNode.attrs.isLoading);
            
            return true
        },
        destroy: () => {
          editor.off('selectionUpdate', onSelectionUpdate)
        }
      }
    }
  }
})
