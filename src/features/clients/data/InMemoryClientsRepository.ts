import { ClientsRepository, ClientsQuery } from './ClientsRepository';
import { Client, ClientDocument } from '../model/clientTypes';

const nowIso = () => new Date().toISOString();

export class InMemoryClientsRepository implements ClientsRepository {
  private clients: Client[] = [
    {
      id: 'c1',
      name: 'חברת אלפא בע״מ',
      notes: 'לקוח אסטרטגי',
      totalPrice: 12000,
      remainingToPay: 4500,
      contacts: [
        {
          id: 'cc1',
          name: 'יובל כהן',
          email: 'alpha@example.com',
          phone: '050-0000001',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
        {
          id: 'cc2',
          name: 'נועה לוי',
          email: 'noa@alpha.example.com',
          phone: undefined,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ],
      documents: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'c2',
      name: 'בטא שירותים',
      totalPrice: 6000,
      remainingToPay: 0,
      contacts: [
        {
          id: 'cc3',
          name: 'שירה לוי',
          email: 'beta@example.com',
          phone: '050-0000002',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ],
      documents: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];

  async list(query?: ClientsQuery): Promise<Client[]> {
    const q = (query?.searchText ?? '').trim().toLowerCase();
    let out = [...this.clients];
    if (q) {
      out = out.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.contacts.some(
            (cc) =>
              cc.name.toLowerCase().includes(q) ||
              (cc.email ?? '').toLowerCase().includes(q) ||
              (cc.phone ?? '').toLowerCase().includes(q)
          )
      );
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async getById(id: string): Promise<Client | null> {
    return this.clients.find((c) => c.id === id) ?? null;
  }

  async create(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'documents'>): Promise<Client> {
    const created: Client = {
      id: `c_${Math.random().toString(16).slice(2)}`,
      ...input,
      contacts: (input.contacts ?? []).map((cc) => ({
        ...cc,
        id: `cc_${Math.random().toString(16).slice(2)}`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      })),
      documents: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.clients = [created, ...this.clients];
    return created;
  }

  async update(
    id: string,
    patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'documents'>>
  ): Promise<Client> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Client not found');
    const updated: Client = {
      ...existing,
      ...patch,
      contacts:
        patch.contacts !== undefined
          ? patch.contacts.map((cc) => ({
              ...cc,
              id: cc.id || `cc_${Math.random().toString(16).slice(2)}`,
              createdAt: cc.createdAt || nowIso(),
              updatedAt: nowIso(),
            }))
          : existing.contacts,
      updatedAt: nowIso(),
    };
    this.clients = this.clients.map((c) => (c.id === id ? updated : c));
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  async addDocument(clientId: string, doc: Omit<ClientDocument, 'id' | 'createdAt'>): Promise<ClientDocument> {
    const existing = await this.getById(clientId);
    if (!existing) throw new Error('Client not found');

    const newDoc: ClientDocument = {
      ...doc,
      id: `doc_${Math.random().toString(16).slice(2)}`,
      createdAt: nowIso(),
    };

    existing.documents = [...(existing.documents ?? []), newDoc];
    return newDoc;
  }

  async removeDocument(documentId: string): Promise<void> {
    this.clients = this.clients.map((c) => ({
      ...c,
      documents: (c.documents ?? []).filter((d) => d.id !== documentId),
    }));
  }
}

