import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, Alert, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- Utility Functions ---

const getLocationName = async (lat, long) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`,
      {
        headers: {
          'User-Agent': 'SupplyChainApp/1.0',
          'Accept': 'application/json',
        },
      }
    );
    const text = await response.text();
    if (!text || text.trim().startsWith('<')) {
      return `${lat}°N, ${long}°E`;
    }
    const data = JSON.parse(text);
    return data.display_name || `${lat}°N, ${long}°E`;
  } catch (error) {
    console.error('Error fetching location:', error);
    return `${lat}°N, ${long}°E`;
  }
};

const { width } = Dimensions.get('window');

// --- Sub-components ---

const Badge = ({ label, color = '#10B981', bgColor = '#ECFDF5' }) => (
  <View style={[badgeStyles.container, { backgroundColor: bgColor, borderColor: color }]}>
    <Text style={[badgeStyles.text, { color }]}>{label}</Text>
  </View>
);

const badgeStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

const Divider = () => <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 }} />;

const InfoRow = ({ icon, label, value, mono = false }) => (
  <View style={infoRowStyles.row}>
    <View style={infoRowStyles.iconWrap}>
      <Ionicons name={icon} size={14} color="#64748B" />
    </View>
    <Text style={infoRowStyles.label}>{label}</Text>
    <Text style={[infoRowStyles.value, mono && infoRowStyles.mono]} numberOfLines={1}>{value}</Text>
  </View>
);

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    width: 90,
  },
  value: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#334155',
  },
});

// --- Main Component ---

export default function Qrdetails({ route, navigation }) {
  const { uniqueid, photoPath } = route.params;
  const [locations, setLocations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationNames, setLocationNames] = useState({});
  const [products, setProducts] = useState([]);
  const [authorizedRetailers, setAuthorizedRetailers] = useState([]);

  const [collapsedSections, setCollapsedSections] = useState({
    products: true,
    retailersList: true,
    journey: true,
  });
  const [participantCollapsed, setParticipantCollapsed] = useState({});

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleParticipant = (key) => {
    setParticipantCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const participantConfigs = {
    manufacturer: { title: 'Manufacturer', icon: 'business-outline', stepTitle: 'Manufacturing', order: 1, color: '#6366F1', bg: '#EEF2FF' },
    wholesaler: { title: 'Wholesaler', icon: 'cube-outline', stepTitle: 'Wholesale Distribution', order: 2, color: '#F59E0B', bg: '#FFFBEB' },
    retailers: { title: 'Retailer', icon: 'storefront-outline', stepTitle: 'Retail Distribution', order: 3, color: '#10B981', bg: '#ECFDF5' },
  };

  const handleFetch = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: `file://${photoPath}`,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      const response = await fetch('http://127.0.0.1:5000/decode_qr', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const result = await response.json();
      let responseData = result;

      if (Array.isArray(result) && result.length > 0 && result[0].data) {
        responseData = result[0].data;
      } else if (result.data) {
        responseData = result.data;
      }

      if (!responseData || !responseData.participants) {
        Alert.alert('Error', 'No participant data found in QR code.');
        setIsLoading(false);
        return;
      }

      const participants = responseData.participants;
      const processedData = {};

      if (participants.manufacturer) {
        processedData.manufacturer = { ...participants.manufacturer };
      }
      if (participants.wholesaler) {
        processedData.wholesaler = { ...participants.wholesaler };
      }
      if (participants.retailers && Array.isArray(participants.retailers)) {
        processedData.retailers = participants.retailers.map(r => ({ ...r }));
      }

      if (responseData.authorised_retailers) {
        setAuthorizedRetailers(Object.values(responseData.authorised_retailers));
      }

      if (responseData.cart_products) {
        const extracted = [];
        Object.keys(responseData.cart_products).forEach(retailerKey => {
          const retailerProducts = responseData.cart_products[retailerKey];
          Object.keys(retailerProducts).forEach(productIndex => {
            const productData = retailerProducts[productIndex].product_details;
            if (productData) extracted.push({ ...productData, retailer: retailerKey });
          });
        });
        setProducts(extracted);
      }

      const hasManufacturer = !!processedData.manufacturer;
      const hasWholesaler = !!processedData.wholesaler;
      const hasRetailers = processedData.retailers && processedData.retailers.length > 0;

      if (!hasManufacturer && !hasWholesaler && !hasRetailers) {
        Alert.alert('Error', 'No participant data found.');
        setIsLoading(false);
        return;
      }

      setLocations(processedData);

      if (processedData.manufacturer) {
        const { user_lat: lat, user_long: long } = processedData.manufacturer;
        if (lat && long) getLocationName(lat, long).then(a => setLocationNames(p => ({ ...p, manufacturer: a })));
      }
      if (processedData.wholesaler) {
        const { user_lat: lat, user_long: long } = processedData.wholesaler;
        if (lat && long) getLocationName(lat, long).then(a => setLocationNames(p => ({ ...p, wholesaler: a })));
      }
      if (processedData.retailers) {
        processedData.retailers.forEach((retailer, i) => {
          const { user_lat: lat, user_long: long } = retailer;
          if (lat && long) {
            getLocationName(lat, long).then(a => {
              setLocationNames(p => {
                const r = [...(p.retailers || [])];
                r[i] = a;
                return { ...p, retailers: r };
              });
            });
          }
        });
      }

      const count = (hasManufacturer ? 1 : 0) + (hasWholesaler ? 1 : 0) + (hasRetailers ? processedData.retailers.length : 0);
      Alert.alert('Verified', `${count} participant(s) authenticated successfully.`);
    } catch (error) {
      Alert.alert('Error', `Failed to fetch: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableParticipants = () => {
    if (!locations) return [];
    const available = [];
    if (locations.manufacturer) available.push({ type: 'manufacturer', order: 1, data: locations.manufacturer, key: 'manufacturer' });
    if (locations.wholesaler) available.push({ type: 'wholesaler', order: 2, data: locations.wholesaler, key: 'wholesaler' });
    if (locations.retailers) {
      locations.retailers.forEach((r, i) => available.push({ type: 'retailers', order: 3, data: r, index: i, key: `retailers-${i}` }));
    }
    return available.sort((a, b) => a.order - b.order);
  };

  const prepareLocationsForRoute = () => {
    if (!locations) return [];
    const r = [];
    if (locations.manufacturer) r.push({ user_type: 'manufacturer', user_lat: parseFloat(locations.manufacturer.user_lat), user_long: parseFloat(locations.manufacturer.user_long) });
    if (locations.wholesaler) r.push({ user_type: 'wholesaler', user_lat: parseFloat(locations.wholesaler.user_lat), user_long: parseFloat(locations.wholesaler.user_long) });
    if (locations.retailers) locations.retailers.forEach(rt => r.push({ user_type: 'retailer', user_lat: parseFloat(rt.user_lat), user_long: parseFloat(rt.user_long) }));
    return r;
  };

  // --- Render: Section Header ---
  const SectionHeader = ({ icon, title, count, sectionKey, color = '#3B82F6' }) => {
    const isExpanded = !collapsedSections[sectionKey];
    return (
      <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(sectionKey)} activeOpacity={0.75}>
        <View style={[styles.sectionIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {count !== undefined && (
          <View style={[styles.countBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.countBadgeText, { color }]}>{count}</Text>
          </View>
        )}
        <View style={[styles.chevronWrap, isExpanded && { backgroundColor: color + '15', transform: [{ rotate: '180deg' }] }]}>
          <Ionicons name="chevron-down" size={16} color={color} />
        </View>
      </TouchableOpacity>
    );
  };

  // --- Render: Participant Card ---
  const renderParticipantCard = (participant) => {
    const { type, data, index, key } = participant;
    const config = participantConfigs[type];
    const isRetailer = type === 'retailers';
    const title = isRetailer ? `${config.title} ${index + 1}` : config.title;
    const locationName = isRetailer
      ? (locationNames.retailers && locationNames.retailers[index])
      : locationNames[type];
    const isAuthorized = isRetailer ? authorizedRetailers.includes(data.metamask_add) : true;
    const isExpanded = !participantCollapsed[key];

    return (
      <View key={key} style={styles.participantCard}>
        {/* Card Header */}
        <TouchableOpacity
          style={styles.participantCardHeader}
          onPress={() => toggleParticipant(key)}
          activeOpacity={0.8}
        >
          <View style={[styles.participantIconCircle, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.participantTitle}>{title}</Text>
            <Text style={styles.participantSubtitle} numberOfLines={1}>
              {locationName || 'Resolving location…'}
            </Text>
          </View>
          <Badge
            label={isAuthorized ? 'Verified' : 'Unverified'}
            color={isAuthorized ? '#10B981' : '#EF4444'}
            bgColor={isAuthorized ? '#ECFDF5' : '#FEF2F2'}
          />
          <View style={[styles.chevronWrap, { marginLeft: 8 }, isExpanded && { transform: [{ rotate: '180deg' }] }]}>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.participantBody}>
            <Divider />
            <InfoRow icon="person-outline" label="User ID" value={data.user_id} />
            <InfoRow icon="layers-outline" label="Type" value={data.user_type} />
            {data.user_lat && data.user_long && (
              <InfoRow icon="navigate-outline" label="Coordinates" value={`${data.user_lat}, ${data.user_long}`} />
            )}
            {locationName && (
              <View style={styles.addressBox}>
                <Ionicons name="location" size={14} color={config.color} style={{ marginTop: 2 }} />
                <Text style={[styles.addressText, { color: config.color.replace(')', ', 0.85)').replace('rgb', 'rgba') }]}>{locationName}</Text>
              </View>
            )}
            {data.metamask_add && (
              <>
                <Divider />
                <View style={styles.blockchainBox}>
                  <View style={styles.blockchainHeader}>
                    <Ionicons name="link" size={13} color="#6366F1" />
                    <Text style={styles.blockchainLabel}>Wallet Address</Text>
                  </View>
                  <Text style={styles.blockchainAddress} numberOfLines={2}>{data.metamask_add}</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  // --- Render: Product Card ---
  const renderProductCard = (product, index) => {
    const isExpired = new Date(product.exp_date) < new Date();
    return (
      <View key={`product-${index}`} style={[styles.productCard, isExpired && styles.productCardExpired]}>
        <View style={styles.productCardTop}>
          <View style={[styles.productIconWrap, { backgroundColor: isExpired ? '#FEE2E2' : '#EFF6FF' }]}>
          <Ionicons name="cube-outline" size={18} color={isExpired ? '#EF4444' : '#3B82F6'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>{product.category}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.productPrice}>₹{product.price_per_unit}</Text>
            <Text style={styles.productPriceLabel}>per unit</Text>
          </View>
        </View>

        <Divider />

        <View style={styles.productMeta}>
          <View style={styles.productMetaItem}>
            <Ionicons name="cube-outline" size={13} color="#64748B" />
            <Text style={styles.productMetaText}>Qty: <Text style={{ color: '#0F172A', fontWeight: '700' }}>{product.quantity}</Text></Text>
          </View>
          <View style={styles.productMetaItem}>
            <Ionicons name="calendar-outline" size={13} color={isExpired ? '#EF4444' : '#64748B'} />
            <Text style={[styles.productMetaText, isExpired && { color: '#EF4444' }]}>
              Exp: <Text style={{ fontWeight: '700' }}>{new Date(product.exp_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </Text>
          </View>
          <View style={styles.productMetaItem}>
            <Ionicons name="storefront-outline" size={13} color="#64748B" />
            <Text style={styles.productMetaText}>Retailer: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{product.retailer}</Text></Text>
          </View>
        </View>

        {isExpired && (
          <View style={styles.expiredBanner}>
            <Ionicons name="warning-outline" size={14} color="#DC2626" />
            <Text style={styles.expiredBannerText}>This product has expired and should not be sold</Text>
          </View>
        )}

        {product.description && (
          <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>
        )}
      </View>
    );
  };

  // --- Render: Journey ---
  const renderSupplyChainJourney = () => {
    const participants = getAvailableParticipants();
    const isExpanded = !collapsedSections.journey;

    return (
      <View style={styles.card}>
        <SectionHeader icon="git-branch-outline" title="Supply Chain Journey" count={participants.length} sectionKey="journey" color="#8B5CF6" />
        {isExpanded && (
          <View style={styles.journeyBody}>
            {participants.map((p, i) => {
              const { type, data, index } = p;
              const config = participantConfigs[type];
              const isRetailer = type === 'retailers';
              const locationName = isRetailer ? (locationNames.retailers && locationNames.retailers[index]) : locationNames[type];
              const isLast = i === participants.length - 1;

              return (
                <View key={`journey-${i}`} style={styles.journeyRow}>
                  {/* Timeline */}
                  <View style={styles.timelineCol}>
                    <View style={[styles.timelineDot, { backgroundColor: config.color }]}>
                      <Text style={styles.timelineDotText}>{i + 1}</Text>
                    </View>
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: config.color + '40' }]} />}
                  </View>
                  {/* Content */}
                  <View style={[styles.journeyContent, isLast && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <View style={styles.journeyContentTop}>
                      <View style={[styles.journeyBadge, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon} size={12} color={config.color} />
                        <Text style={[styles.journeyBadgeText, { color: config.color }]}>
                          {isRetailer ? `${config.title} ${index + 1}` : config.title}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.journeyTitle}>{config.stepTitle}</Text>
                    <Text style={styles.journeyLocation} numberOfLines={2}>
                      {locationName || 'Resolving address…'}
                    </Text>
                    <Text style={styles.journeyId}>ID: {data.user_id}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // --- Render: Route Button ---
  const renderViewRouteButton = () => {
    const routeLocations = prepareLocationsForRoute();
    if (routeLocations.length < 2 || collapsedSections.journey) return null;
    return (
      <TouchableOpacity
        style={styles.routeButton}
        onPress={() => navigation.navigate('Shproute', { locations: routeLocations })}
        activeOpacity={0.8}
      >
        <Ionicons name="map" size={18} color="white" />
        <Text style={styles.routeButtonText}>View Route on Map</Text>
        <View style={styles.routeButtonBadge}>
          <Text style={styles.routeButtonBadgeText}>{routeLocations.length} stops</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
    );
  };

  // --- Main Render ---
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Image Card */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: `file://${photoPath}` }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <View style={styles.imageOverlayInner}>
              <Ionicons name="qr-code-outline" size={14} color="white" />
              <Text style={styles.imageOverlayText}>ID: {uniqueid}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => navigation.navigate('Authentic', { uniqueid })}
            disabled={isLoading}
            activeOpacity={0.75}
          >
            <Ionicons name="camera-outline" size={18} color="#475569" />
            <Text style={styles.secondaryBtnText}>Retake Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn, isLoading && styles.loadingBtn]}
            onPress={handleFetch}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.primaryBtnText}>Scanning…</Text>
              </>
            ) : (
              <>
                <Ionicons name="scan-outline" size={18} color="white" />
                <Text style={styles.primaryBtnText}>Fetch Details</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Verified Banner */}
        {locations && (
          <View style={styles.verifiedBanner}>
            <View style={styles.verifiedBannerLeft}>
              <View style={styles.verifiedIconWrap}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
              </View>
              <View>
                <Text style={styles.verifiedBannerTitle}>Authenticated</Text>
                <Text style={styles.verifiedBannerSubtitle}>Genuine & Authorized Pack</Text>
              </View>
            </View>
            <View style={styles.verifiedChip}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedChipText}>VERIFIED</Text>
            </View>
          </View>
        )}

        {/* Stats Strip */}
        {locations && (
          <View style={styles.statsStrip}>
            {[
              { icon: 'people-outline', value: getAvailableParticipants().length, label: 'Participants', color: '#6366F1' },
              { icon: 'cube-outline', value: products.length, label: 'Products', color: '#F59E0B' },
              { icon: 'git-branch-outline', value: getAvailableParticipants().length, label: 'Chain Steps', color: '#10B981' },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: s.color + '18' }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Details Sections */}
        {locations && (
          <View style={styles.sectionsContainer}>
            {/* Products */}
            {products.length > 0 && (
              <View style={styles.card}>
                <SectionHeader icon="basket-outline" title="Cart Contents" count={products.length} sectionKey="products" color="#F59E0B" />
                {!collapsedSections.products && (
                  <View style={styles.cardBody}>
                    {products.map((product, index) => renderProductCard(product, index))}
                  </View>
                )}
              </View>
            )}

            {/* Journey */}
            {renderSupplyChainJourney()}

            {/* Route Button */}
            {renderViewRouteButton()}

            {/* Participants */}
            <View style={styles.participantsSectionHeader}>
              <View style={styles.participantsSectionLine} />
              <Text style={styles.participantsSectionLabel}>Participant Details</Text>
              <View style={styles.participantsSectionLine} />
            </View>

            {getAvailableParticipants().map(p => renderParticipantCard(p))}

            {/* Bottom Padding */}
            <View style={{ height: 32 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// --- Stylesheet ---

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Image Card
  imageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 220,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  imageOverlayInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingBtn: {
    backgroundColor: '#3B82F6',
    opacity: 0.85,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },

  // Verified Banner
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifiedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.2,
  },
  verifiedBannerSubtitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginTop: 2,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6EE7B7',
  },
  verifiedChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sections
  sectionsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardBody: {
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    letterSpacing: 0.1,
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Product Card
  productCard: {
    backgroundColor: '#FAFCFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  productCardExpired: {
    backgroundColor: '#FFF8F8',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  productCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  productIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  productCategory: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  productPriceLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
  },
  productMeta: {
    gap: 6,
  },
  productMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productMetaText: {
    fontSize: 13,
    color: '#64748B',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  expiredBannerText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  productDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // Journey
  journeyBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  journeyRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineCol: {
    alignItems: 'center',
    width: 32,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineDotText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginVertical: 4,
    borderRadius: 1,
  },
  journeyContent: {
    flex: 1,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 2,
  },
  journeyContentTop: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  journeyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  journeyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  journeyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  journeyLocation: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  journeyId: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    fontWeight: '500',
  },

  // Route Button
  routeButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 10,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  routeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  routeButtonBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  routeButtonBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Participants Section Label
  participantsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  participantsSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  participantsSectionLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Participant Card
  participantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  participantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  participantIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  participantSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    maxWidth: width * 0.35,
  },
  participantBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FAFCFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  addressText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    flex: 1,
  },
  blockchainBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  blockchainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  blockchainLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  blockchainAddress: {
    fontSize: 11,
    color: '#4338CA',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});