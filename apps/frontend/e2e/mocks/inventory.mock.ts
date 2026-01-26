export const mockInventory = {
  success: true,
  items: [
    {
      assetid: '1234567890',
      classid: '310776543',
      instanceid: '302028390',
      name: 'AK-47 | Redline',
      market_hash_name: 'AK-47 | Redline (Field-Tested)',
      icon_url: '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZW_0IdWQegA4YFvV_we5kO_mg5O06pzMn3JjuyEksHiMmRW0hB9Pa7RxxavJe4fTj30',
      tradable: true,
      marketable: true,
      amount: 1,
      type: 'Rifle',
      descriptions: [{ type: 'html', value: 'Exterior: Field-Tested' }]
    },
    {
      assetid: '9876543210',
      classid: '310776999',
      instanceid: '302028111',
      name: 'AWP | Asiimov',
      market_hash_name: 'AWP | Asiimov (Field-Tested)',
      icon_url: '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2DwIv5dy0r6Xrdqj0Q3i_kA9MGDyJIeQIFQ4YwnWr1Lrk-zogpDqu53LmnI17CMr4ivUgVXp1k-uQxJ_',
      tradable: true,
      marketable: true,
      amount: 1,
      type: 'Sniper Rifle',
      descriptions: [{ type: 'html', value: 'Exterior: Field-Tested' }]
    }
  ]
};

export const mockEmptyInventory = {
  success: true,
  items: []
};

export const mockTradeSuccess = {
  success: true,
  tradeId: 'TRADE-123-UUID',
  status: 'sent',
  message: 'Trade offer sent successfully'
};
