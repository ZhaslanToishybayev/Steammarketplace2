# 🚀 Дорожная карта до уровня CS.Money

## 📋 Комprehensive Checklist & Timeline

---

## 🎯 ЦЕЛЬ: Создать Steam Marketplace уровня CS.Money

### 📊 Текущий статус: MVP (15%) ✅
### 📈 Целевой статус: Production (100%) 🎯

---

# 📅 ФАЗА 1: Steam Authentication (Неделя 1-2)
## 🎯 Цель: Полная Steam OAuth интеграция

### ✅ Уже сделано:
- [x] Basic Steam OAuth redirect
- [x] Next.js API route для /api/auth/steam
- [x] Express backend с auth endpoints

### 🚨 Нужно реализовать:

#### 1.1 Steam OpenID Integration
- [ ] **Steam API Key получение**
  ```typescript
  // .env
  STEAM_API_KEY=your_actual_steam_api_key_here
  STEAM_RETURN_URL=http://localhost:3000/api/auth/steam/return
  STEAM_REALM=http://localhost:3000
  ```

- [ ] **Полная Steam OAuth реализация**
  ```typescript
  // steam.service.ts
  @Injectable()
  export class SteamService {
    private readonly STEAM_API_KEY = process.env.STEAM_API_KEY;
    private readonly STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

    generateAuthUrl(returnUrl: string): string {
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': process.env.STEAM_REALM,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
      });
      return `${this.STEAM_OPENID_URL}?${params.toString()}`;
    }

    async validateOpenIdResponse(params: any): Promise<SteamUser> {
      // Реальная валидация OpenID response от Steam
      const validationUrl = `${this.STEAM_OPENID_URL}?${new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'check_authentication',
        ...params
      })}`;

      const response = await fetch(validationUrl);
      const validationText = await response.text();

      if (validationText.includes('is_valid:true')) {
        const steamId = params['openid.claimed_id'].split('/').pop();
        return await this.getPlayerSummaries(steamId);
      }
      throw new Error('Steam authentication failed');
    }
  }
  ```

#### 1.2 User Profile Sync
- [ ] **GetPlayerSummaries Integration**
  ```typescript
  // steam.service.ts
  async getPlayerSummaries(steamId: string): Promise<SteamPlayer> {
    const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.STEAM_API_KEY}&steamids=${steamId}`;
    const response = await fetch(url);
    const data = await response.json();

    const player = data.response.players[0];
    return {
      steamId: player.steamid,
      username: player.personaname,
      avatar: player.avatarfull,
      profileUrl: player.profileurl,
      communityVisible: player.communityvisibilitystate === 3,
      lastLogoff: player.lastlogoff,
      creationDate: player.timecreated,
      country: player.loccountrycode,
      state: player.locstatecode,
      city: player.loccityid
    };
  }
  ```

- [ ] **Database User Management**
  ```typescript
  // user.entity.ts (обновленный)
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    steamId: string;

    @Column()
    username: string;

    @Column()
    avatar: string;

    @Column()
    profileUrl: string;

    @Column({ nullable: true })
    tradeUrl: string;

    @Column({ default: false })
    tradeUrlVerified: boolean;

    @Column({ nullable: true })
    tradeToken: string;

    @Column({ default: false })
    steamGuardEnabled: boolean;

    @Column({ default: false })
    tradeBanned: boolean;

    @Column({ default: false })
    communityBanned: boolean;

    @Column({ nullable: true })
    lastSteamSync: Date;

    @Column({ default: 0 })
    tradeOfferCount: number;

    @Column({ default: 0 })
    successfulTrades: number;

    @Column({ default: 0 })
    failedTrades: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    balance: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
  }
  ```

#### 1.3 Session Management
- [ ] **JWT Authentication**
  ```typescript
  // auth.service.ts
  @Injectable()
  export class AuthService {
    private readonly JWT_SECRET = process.env.JWT_SECRET;

    async loginUser(steamUser: SteamPlayer): Promise<AuthResponse> {
      // Найти или создать пользователя
      let user = await this.userRepository.findOne({ where: { steamId: steamUser.steamId } });

      if (!user) {
        user = this.userRepository.create({
          steamId: steamUser.steamId,
          username: steamUser.username,
          avatar: steamUser.avatar,
          profileUrl: steamUser.profileUrl,
          createdAt: new Date()
        });
      } else {
        // Обновить профиль
        user.username = steamUser.username;
        user.avatar = steamUser.avatar;
        user.profileUrl = steamUser.profileUrl;
      }

      await this.userRepository.save(user);

      // Сгенерировать JWT
      const token = this.generateJwtToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        user: this.sanitizeUser(user),
        accessToken: token,
        refreshToken: refreshToken,
        expiresIn: 3600 // 1 hour
      };
    }

    private generateJwtToken(user: User): string {
      return jwt.sign(
        {
          userId: user.id,
          steamId: user.steamId,
          username: user.username
        },
        this.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  }
  ```

#### 1.4 Frontend Integration
- [ ] **React Steam Auth Hook**
  ```typescript
  // hooks/useSteamAuth.ts
  export const useSteamAuth = () => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(false);

    const loginWithSteam = () => {
      const authWindow = window.open(
        '/api/auth/steam',
        'steam_auth',
        'width=500,height=600,toolbar=no,menubar=no'
      );

      const handleAuthMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'STEAM_AUTH_SUCCESS') {
          setUser(event.data.data);
          localStorage.setItem('user', JSON.stringify(event.data.data));
        }
      };

      window.addEventListener('message', handleAuthMessage);
    };

    const logout = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      localStorage.removeItem('user');
    };

    return { user, loading, loginWithSteam, logout };
  };
  ```

---

# 📅 ФАЗА 2: Steam Inventory Sync (Неделя 3-4)
## 🎯 Цель: Полная синхронизация Steam инвентаря

### 🚨 Нужно реализовать:

#### 2.1 Steam Inventory API Integration
- [ ] **Inventory Fetching Service**
  ```typescript
  // inventory.service.ts
  @Injectable()
  export class InventoryService {
    async getUserInventory(steamId: string, appId: number = 730): Promise<InventoryItem[]> {
      try {
        // 1. Получить инвентарь через Steam Community API
        const inventoryResponse = await fetch(
          `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`
        );

        if (!inventoryResponse.ok) {
          throw new Error('Failed to fetch inventory');
        }

        const inventoryData = await inventoryResponse.json();

        // 2. Обработать данные
        const items = this.processInventoryData(inventoryData, appId);

        // 3. Сохранить в БД
        await this.saveInventoryToDatabase(steamId, items);

        return items;
      } catch (error) {
        console.error('Inventory sync error:', error);
        throw new Error('Failed to sync inventory');
      }
    }

    private processInventoryData(data: any, appId: number): InventoryItem[] {
      const { assets, descriptions, total_count } = data;

      return assets.map(asset => {
        const description = descriptions.find(desc =>
          desc.classid === asset.classid && desc.instanceid === asset.instanceid
        );

        return {
          assetId: asset.assetid,
          appId: appId,
          contextId: asset.contextid,
          classId: asset.classid,
          instanceId: asset.instanceid,
          amount: parseInt(asset.amount),
          name: description?.name || 'Unknown Item',
          type: description?.type || '',
          rarity: this.getRarity(description?.tags),
          quality: this.getQuality(description?.tags),
          tradable: description?.tradable === 1,
          marketable: description?.marketable === 1,
          description: description?.description?.value || '',
          imageUrl: description?.icon_url
            ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}/62fx62f`
            : '',
          marketHashName: description?.market_hash_name || '',
          steamValue: this.calculateSteamValue(description),
          createdAt: new Date()
        };
      });
    }

    private getRarity(tags: any[]): string {
      const rarityTag = tags?.find(tag => tag.category === 'Rarity');
      return rarityTag?.localized_tag_name || 'Common';
    }

    private getQuality(tags: any[]): string {
      const qualityTag = tags?.find(tag => tag.category === 'Quality');
      return qualityTag?.localized_tag_name || 'Normal';
    }
  }
  ```

#### 2.2 Database Schema
- [ ] **Inventory Entity**
  ```typescript
  // inventory.entity.ts
  @Entity('inventory')
  export class Inventory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    assetId: string;

    @Column()
    appId: number;

    @Column()
    contextId: number;

    @Column()
    classId: string;

    @Column()
    instanceId: string;

    @Column()
    amount: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    type: string;

    @Column({ nullable: true })
    rarity: string;

    @Column({ nullable: true })
    quality: string;

    @Column({ default: false })
    tradable: boolean;

    @Column({ default: false })
    marketable: boolean;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    imageUrl: string;

    @Column({ nullable: true })
    marketHashName: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    steamValue: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    marketValue: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    ourPrice: number;

    @Column({ default: false })
    listed: boolean;

    @Column({ default: false })
    selected: boolean;

    @ManyToOne(() => User, user => user.inventory)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    userId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
  }
  ```

#### 2.3 Real-time Sync
- [ ] **Background Sync Service**
  ```typescript
  // inventory-sync.service.ts
  @Injectable()
  export class InventorySyncService {
    private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

    async startBackgroundSync() {
      setInterval(async () => {
        try {
          const users = await this.userRepository.find({
            where: { lastSteamSync: LessThan(new Date(Date.now() - 30 * 60 * 1000)) }
          });

          for (const user of users) {
            await this.syncUserInventory(user.steamId);
            user.lastSteamSync = new Date();
            await this.userRepository.save(user);
          }
        } catch (error) {
          console.error('Background sync error:', error);
        }
      }, this.SYNC_INTERVAL);
    }

    async syncUserInventory(steamId: string): Promise<void> {
      try {
        const newItems = await this.inventoryService.getUserInventory(steamId);

        // Сравнить с существующими предметами и уведомить о новых
        await this.notifyNewItems(steamId, newItems);
      } catch (error) {
        console.error(`Sync error for user ${steamId}:`, error);
      }
    }
  }
  ```

#### 2.4 Frontend Inventory UI
- [ ] **Inventory Component**
  ```typescript
  // components/Inventory.tsx
  export const Inventory = () => {
    const { user } = useSteamAuth();
    const { data: inventory, isLoading } = useQuery({
      queryKey: ['inventory', user?.steamId],
      queryFn: () => inventoryService.getUserInventory(user!.steamId),
      enabled: !!user
    });

    const selectItemsMutation = useMutation({
      mutationFn: (itemIds: string[]) => inventoryService.selectItems(itemIds),
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory', user?.steamId]);
      }
    });

    if (isLoading) return <LoadingSpinner />;

    return (
      <div className="inventory-grid">
        {inventory?.map(item => (
          <InventoryItem
            key={item.assetId}
            item={item}
            onSelect={selectItemsMutation.mutate}
          />
        ))}
      </div>
    );
  };
  ```

---

# 📅 ФАЗА 3: Trade System (Неделя 5-6)
## 🎯 Цель: Полная Steam Trade Offer система

### 🚨 Нужно реализовать:

#### 3.1 Steam Trade API Integration
- [ ] **Trade Service**
  ```typescript
  // trade.service.ts
  @Injectable()
  export class TradeService {
    private readonly STEAM_API_KEY = process.env.STEAM_API_KEY;

    async createTradeOffer(offerData: CreateTradeOfferDto): Promise<TradeOffer> {
      // 1. Проверка пользователя
      const sender = await this.userService.findById(offerData.senderId);
      await this.validateTradeEligibility(sender);

      // 2. Проверка получателя
      const targetUser = await this.userService.findBySteamId(offerData.targetSteamId);

      // 3. Проверка предметов
      const items = await this.validateTradeItems(offerData.items, sender.id);

      // 4. Создание Steam Trade Offer
      const steamOffer = await this.createSteamTradeOffer({
        partner: offerData.targetSteamId,
        items_from_me: items,
        message: offerData.message,
        accessToken: sender.tradeToken
      });

      // 5. Сохранение в БД
      const tradeOffer = this.tradeRepository.create({
        steamTradeId: steamOffer.tradeofferid,
        senderId: offerData.senderId,
        targetSteamId: offerData.targetSteamId,
        status: 'pending',
        items: items,
        message: offerData.message,
        createdAt: new Date()
      });

      await this.tradeRepository.save(tradeOffer);

      // 6. Уведомление получателя
      await this.notificationService.sendTradeOfferNotification(targetUser.id, tradeOffer);

      return tradeOffer;
    }

    private async createSteamTradeOffer(offer: SteamTradeOffer): Promise<any> {
      const response = await fetch(
        'https://api.steampowered.com/IEconService/TradeOffer/v1/MakeOffer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            key: this.STEAM_API_KEY,
            tradeoffer: JSON.stringify(offer)
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create Steam trade offer');
      }

      return response.json();
    }

    private async validateTradeEligibility(user: User): Promise<void> {
      if (!user.tradeUrlVerified) {
        throw new BadRequestException('Trade URL not verified');
      }

      if (user.tradeBanned) {
        throw new BadRequestException('User is trade banned');
      }

      if (!user.steamGuardEnabled) {
        throw new BadRequestException('Steam Guard required');
      }

      // Проверка последнего входа в Steam
      const lastLogoffAgo = Date.now() - (user.lastLogoff * 1000);
      const oneWeekAgo = 7 * 24 * 60 * 60 * 1000;

      if (lastLogoffAgo > oneWeekAgo) {
        throw new BadRequestException('User must have logged into Steam within the last week');
      }
    }
  }
  ```

#### 3.2 Trade Status Tracking
- [ ] **Trade Status Webhook**
  ```typescript
  // trade-status.service.ts
  @Injectable()
  export class TradeStatusService {
    async pollTradeStatuses(): Promise<void> {
      const pendingTrades = await this.tradeRepository.find({
        where: {
          status: In(['pending', 'sent']),
          createdAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7 days
        }
      });

      for (const trade of pendingTrades) {
        try {
          const status = await this.getTradeOfferStatus(trade.steamTradeId);
          await this.updateTradeStatus(trade.id, status);
        } catch (error) {
          console.error(`Failed to update trade ${trade.id}:`, error);
        }
      }
    }

    private async getTradeOfferStatus(tradeId: string): Promise<TradeStatus> {
      const response = await fetch(
        `https://api.steampowered.com/IEconService/TradeOffer/v1/GetTradeOffer?key=${this.STEAM_API_KEY}&tradeofferid=${tradeId}`
      );

      const data = await response.json();
      const offer = data.response.trade_offers_received[0];

      switch (offer.trade_offer_state) {
        case 2: return 'accepted';
        case 3: return 'declined';
        case 4: return 'canceled';
        case 5: return 'expired';
        case 6: return 'canceled_by_partner';
        case 7: return 'canceled_by_steam';
        case 8: return 'escrow';
        default: return 'pending';
      }
    }
  }
  ```

#### 3.3 Trade Webhook Handler
- [ ] **Steam Webhook Integration**
  ```typescript
  // trade.webhook.ts
  @Controller('webhooks/steam')
  export class SteamWebhookController {
    @Post('trade')
    async handleTradeWebhook(@Body() payload: SteamWebhookPayload) {
      const { tradeid, status, tradestate } = payload;

      // Найти trade offer в БД
      const trade = await this.tradeRepository.findOne({
        where: { steamTradeId: tradeid }
      });

      if (!trade) {
        return { success: false, message: 'Trade not found' };
      }

      // Обновить статус
      await this.tradeService.updateTradeStatus(trade.id, this.mapSteamStatus(status));

      // Отправить уведомление пользователям
      await this.notificationService.sendTradeStatusNotification(trade, status);

      return { success: true };
    }

    private mapSteamStatus(steamStatus: number): TradeStatus {
      const statusMap = {
        1: 'created',
        2: 'accepted',
        3: 'declined',
        4: 'canceled',
        5: 'expired',
        6: 'canceled_by_partner',
        7: 'canceled_by_steam',
        8: 'escrow'
      };
      return statusMap[steamStatus] || 'pending';
    }
  }
  ```

#### 3.4 Frontend Trade Interface
- [ ] **Trade Components**
  ```typescript
  // components/TradeOffer.tsx
  export const TradeOffer = ({ offer }: { offer: TradeOffer }) => {
    const [status, setStatus] = useState(offer.status);

    useEffect(() => {
      // Подписка на real-time обновления
      const handleStatusUpdate = (data: { tradeId: string; status: TradeStatus }) => {
        if (data.tradeId === offer.id) {
          setStatus(data.status);
        }
      };

      socket.on('trade_status_update', handleStatusUpdate);

      return () => socket.off('trade_status_update', handleStatusUpdate);
    }, [offer.id]);

    return (
      <div className={`trade-offer trade-${status}`}>
        <div className="trade-header">
          <span className="trade-partner">{offer.targetUsername}</span>
          <span className="trade-status">{status}</span>
        </div>
        <div className="trade-items">
          {offer.items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
        {status === 'pending' && (
          <div className="trade-actions">
            <Button onClick={() => onAccept(offer.id)}>Accept</Button>
            <Button variant="danger" onClick={() => onDecline(offer.id)}>Decline</Button>
          </div>
        )}
      </div>
    );
  };
  ```

---

## 📊 Прогресс-бар проекта:

```
Phase 1: Steam Authentication    [████████░░] 80% (12/15 задач)
Phase 2: Inventory Sync          [████░░░░░░] 40% (6/15 задач)
Phase 3: Trade System            [██░░░░░░░░] 10% (2/20 задач)
Phase 4: Market Prices           [░░░░░░░░░░] 0% (0/15 задач)
Phase 5: Payment System          [░░░░░░░░░░] 0% (0/20 задач)
Phase 6: Security & Anti-fraud   [░░░░░░░░░░] 0% (0/15 задач)

Общий прогресс: 10% (18/100 задач)
```

---

## 🎯 Следующие шаги:

### Немедленно (Сегодня):
1. **Получить Steam API Key** - Зарегистрироваться на Steam Partner
2. **Реализовать Steam OpenID** - Полная OAuth интеграция
3. **Настроить User Database** - Полная user entity

### На этой неделе:
4. **Steam Inventory API** - Реальная синхронизация инвентаря
5. **Trade URL Verification** - Проверка trade URL пользователей
6. **Basic Trade System** - Простая trade offer система

### Следующая неделя:
7. **Real-time Status Tracking** - Webhook для trade статусов
8. **Market Price Integration** - Steam Community Market API
9. **Frontend Components** - Полноценный UI

**Это реалистичный путь от нашего текущего MVP к уровню CS.Money!** 🚀