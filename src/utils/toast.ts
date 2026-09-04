import { toast } from 'sonner';

export interface FormattedError {
  title: string;
  description: string;
}

/**
 * Extracts comprehensive details from Axios errors, response bodies, status codes,
 * and network exceptions so developers don't have to inspect the Network tab.
 */
export function formatErrorDetail(err: any): FormattedError {
  if (!err) {
    return { title: 'Unknown Error', description: 'An unspecified error occurred.' };
  }

  if (typeof err === 'string') {
    return { title: 'Error', description: err };
  }

  // Axios HTTP Error
  if (err.response) {
    const status = err.response.status;
    const statusText = err.response.statusText || '';
    const url = err.config?.url || '';
    const method = (err.config?.method || 'POST').toUpperCase();
    const respData = err.response.data;

    let detail = '';
    if (respData) {
      if (typeof respData === 'string') {
        detail = respData;
      } else if (respData.message) {
        detail = respData.message;
        if (respData.error && respData.error !== respData.message) {
          detail += ` • ${typeof respData.error === 'string' ? respData.error : JSON.stringify(respData.error)}`;
        }
        if (respData.details) {
          detail += ` • ${JSON.stringify(respData.details)}`;
        }
      } else if (respData.error) {
        detail = typeof respData.error === 'string' ? respData.error : JSON.stringify(respData.error);
      } else {
        detail = JSON.stringify(respData);
      }
    } else {
      detail = err.message || statusText;
    }

    const title = `${method} ${url || ''} [${status}${statusText ? ' ' + statusText : ''}]`.trim();
    return { title, description: detail || 'Server returned an error response.' };
  }

  // Network / General JavaScript Error
  if (err.message) {
    return { title: 'Network / Client Error', description: err.message };
  }

  return { title: 'Error', description: JSON.stringify(err) };
}

export const notify = {
  error: (title: string, errOrDesc?: any, duration?: number) => {
    if (errOrDesc && typeof errOrDesc === 'object') {
      const { title: autoTitle, description } = formatErrorDetail(errOrDesc);
      toast.error(title || autoTitle, {
        description: description || autoTitle,
        ...(duration !== undefined ? { duration } : {}),
      });
    } else {
      toast.error(title, {
        description: typeof errOrDesc === 'string' ? errOrDesc : undefined,
        ...(duration !== undefined ? { duration } : {}),
      });
    }
  },

  apiError: (actionTitle: string, err: any, duration?: number) => {
    const { title: endpointTitle, description } = formatErrorDetail(err);
    toast.error(actionTitle, {
      description: `${endpointTitle}: ${description}`,
      ...(duration !== undefined ? { duration } : {}),
    });
  },

  success: (title: string, description?: string, duration?: number) => {
    toast.success(title, {
      description,
      ...(duration !== undefined ? { duration } : {}),
    });
  },

  info: (title: string, description?: string, duration?: number) => {
    toast.info(title, {
      description,
      ...(duration !== undefined ? { duration } : {}),
    });
  },

  warning: (title: string, description?: string, duration?: number) => {
    toast.warning(title, {
      description,
      ...(duration !== undefined ? { duration } : {}),
    });
  },
};
