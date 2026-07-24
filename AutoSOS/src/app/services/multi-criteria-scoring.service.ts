import { Injectable } from '@angular/core';

export interface ScoringCriteria {
  name: string;
  weight: number;
  description: string;
}

export interface MechanicScore {
  mechanicId: string;
  totalScore: number;
  criteriaScores: {
    [key: string]: number;
  };
  breakdown: {
    distance: number;
    specialization: number;
    rating: number;
    availability: number;
    experience: number;
    responseTime: number;
  };
}

export interface ServiceSpecialization {
  serviceType: string;
  requiredSpecializations: string[];
  priority: 'high' | 'medium' | 'low';
}

@Injectable({
  providedIn: 'root'
})
export class MultiCriteriaScoringService {

  // Service type to specialization mapping
  private readonly SERVICE_SPECIALIZATIONS: { [key: string]: ServiceSpecialization } = {
    'tire_assistance': {
      serviceType: 'Tire Assistance',
      requiredSpecializations: ['general repair', 'tire service', 'wheel service'],
      priority: 'medium'
    },
    'emergency_fuel': {
      serviceType: 'Emergency Fuel',
      requiredSpecializations: ['general repair', 'fuel system', 'emergency service'],
      priority: 'high'
    },
    'oil_leak': {
      serviceType: 'Oil Leak',
      requiredSpecializations: ['engine and mechanical', 'oil system', 'engine repair'],
      priority: 'high'
    },
    'overheating': {
      serviceType: 'Overheating',
      requiredSpecializations: ['engine and mechanical', 'cooling system', 'engine repair'],
      priority: 'high'
    },
    'non_functional_brake_lights': {
      serviceType: 'Non Functional Brake Lights',
      requiredSpecializations: ['electrical', 'lighting system', 'brake system'],
      priority: 'medium'
    },
    'short_circuit': {
      serviceType: 'Short Circuit',
      requiredSpecializations: ['electrical', 'electrical system', 'wiring'],
      priority: 'high'
    },
    'dead_battery': {
      serviceType: 'Dead Battery',
      requiredSpecializations: ['electrical', 'battery service', 'electrical system'],
      priority: 'high'
    }
  };

  // Default scoring criteria weights
  private readonly DEFAULT_CRITERIA: ScoringCriteria[] = [
    { name: 'distance', weight: 0.25, description: 'Distance from client location' },
    { name: 'specialization', weight: 0.30, description: 'Specialization match with service type' },
    { name: 'rating', weight: 0.20, description: 'Mechanic rating and reviews' },
    { name: 'availability', weight: 0.15, description: 'Current availability status' },
    { name: 'experience', weight: 0.05, description: 'Years of experience' },
    { name: 'responseTime', weight: 0.05, description: 'Average response time' }
  ];

  /**
   * Calculate simplified score: Distance Score + Specialization Score
   * Distance Score = 1 - (distance / 5)
   * Specialization Score = 1 for exact match, 0 for no match
   */
  calculateMechanicScore(
    mechanic: any,
    booking: any,
    customWeights?: { [key: string]: number }
  ): MechanicScore {
    // Comprehensive debug logging at the start
    this.debugScoringInput(mechanic, booking);
    
    // Ensure mechanic has distance calculated if coordinates are available
    const enhancedMechanic = this.ensureDistanceCalculated(mechanic, booking);
    
    // Calculate the two main scores
    const distanceScore = this.calculateDistanceScore(enhancedMechanic, booking);
    const specializationScore = this.calculateSpecializationScore(enhancedMechanic, booking);
    
    // Total score is simply the sum of distance + specialization
    const totalScore = distanceScore + specializationScore;

    // Debug logging for the final score
    console.log(`📊 Final Score for ${enhancedMechanic.name}:`, {
      mechanicId: enhancedMechanic.user_id || enhancedMechanic.id,
      distance: enhancedMechanic.distance || enhancedMechanic.distance_km,
      distanceScore,
      specializationScore,
      totalScore
    });

    return {
      mechanicId: enhancedMechanic.user_id || enhancedMechanic.id,
      totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
      criteriaScores: {
        distance: distanceScore,
        specialization: specializationScore,
        rating: 0, // Not used in simplified scoring
        availability: 0, // Not used in simplified scoring
        experience: 0, // Not used in simplified scoring
        responseTime: 0 // Not used in simplified scoring
      },
      breakdown: {
        distance: distanceScore,
        specialization: specializationScore,
        rating: 0,
        availability: 0,
        experience: 0,
        responseTime: 0
      }
    };
  }

  /**
   * Debug method to log all input data for scoring
   */
  private debugScoringInput(mechanic: any, booking: any): void {
    console.log('🔍 === SCORING DEBUG START ===');
    console.log('📋 Mechanic Object:', {
      id: mechanic.id,
      user_id: mechanic.user_id,
      name: mechanic.name,
      specialization: mechanic.specialization,
      latitude: mechanic.latitude,
      longitude: mechanic.longitude,
      distance: mechanic.distance,
      distance_km: mechanic.distance_km,
      availability: mechanic.availability,
      rating: mechanic.rating,
      fullObject: mechanic
    });
    
    console.log('📋 Booking Object:', {
      required_specialization: booking.required_specialization,
      client_latitude: booking.client_latitude,
      client_longitude: booking.client_longitude,
      fullObject: booking
    });
    console.log('🔍 === SCORING DEBUG END ===');
  }

  /**
   * Ensure mechanic object has distance calculated if coordinates are available
   */
  private ensureDistanceCalculated(mechanic: any, booking: any): any {
    // If distance is already available, return as is
    if (mechanic.distance || mechanic.distance_km) {
      return mechanic;
    }

    // If we have coordinates, calculate distance
    if (mechanic.latitude && mechanic.longitude && booking.client_latitude && booking.client_longitude) {
      const calculatedDistance = this.calculateDistance(
        booking.client_latitude,
        booking.client_longitude,
        mechanic.latitude,
        mechanic.longitude
      );
      
      console.log(`📍 Ensuring distance calculated for ${mechanic.name}: ${calculatedDistance}km`);
      
      return {
        ...mechanic,
        distance: calculatedDistance,
        distance_km: calculatedDistance
      };
    }

    return mechanic;
  }

  /**
   * Calculate distance score using formula: 1 - (distance / 5)
   * Where 5 is the maximum distance
   */
  private calculateDistanceScore(mechanic: any, booking: any): number {
    // Debug logging to see what's in the mechanic object
    console.log('🔍 Distance calculation debug:', {
      mechanicId: mechanic.id || mechanic.user_id,
      mechanicName: mechanic.name,
      mechanicDistance: mechanic.distance,
      mechanicDistanceKm: mechanic.distance_km,
      mechanicLatitude: mechanic.latitude,
      mechanicLongitude: mechanic.longitude,
      bookingLatitude: booking.client_latitude,
      bookingLongitude: booking.client_longitude,
      fullMechanicObject: mechanic
    });

    let distance = mechanic.distance || mechanic.distance_km;
    
    // If distance is not available, calculate it from coordinates
    if (!distance && mechanic.latitude && mechanic.longitude && booking.client_latitude && booking.client_longitude) {
      distance = this.calculateDistance(
        booking.client_latitude,
        booking.client_longitude,
        mechanic.latitude,
        mechanic.longitude
      );
      console.log(`📍 Calculated distance: ${distance}km`);
    }
    
    // If still no distance, try to get it from the mechanic object properties
    if (!distance) {
      // Check for other possible distance field names
      distance = mechanic.distance_km || mechanic.distanceKm || mechanic.distance_km_rounded;
      console.log(`🔍 Trying alternative distance fields: ${distance}`);
    }
    
    // Final fallback: if we have coordinates, calculate distance even if it's 0
    if ((!distance || distance === 0) && mechanic.latitude && mechanic.longitude && booking.client_latitude && booking.client_longitude) {
      distance = this.calculateDistance(
        booking.client_latitude,
        booking.client_longitude,
        mechanic.latitude,
        mechanic.longitude
      );
      console.log(`📍 Final fallback distance calculation: ${distance}km`);
    }
    
    if (!distance && distance !== 0) {
      console.log('❌ No distance found in mechanic object and cannot calculate from coordinates');
      return 0;
    }
    
    const maxDistance = 5; // Maximum distance for scoring
    
    // Formula: 1 - (distance / 5)
    // When distance = 0: 1 - (0/5) = 1 - 0 = 1.0 (perfect score)
    // When distance = 5: 1 - (5/5) = 1 - 1 = 0.0 (minimum score)
    const distanceScore = 1 - (distance / maxDistance);
    
    console.log(`📏 Distance score calculation: ${distance}km -> ${distanceScore} (formula: 1 - ${distance}/${maxDistance})`);
    
    // Ensure score doesn't go below 0
    return Math.max(0, distanceScore);
  }

  /**
   * Calculate specialization match score (1 for match, 0 for no match)
   * Simplified binary scoring based on problem-specialization mapping
   */
  private calculateSpecializationScore(mechanic: any, booking: any): number {
    const requiredSpecialization = booking.required_specialization;
    let mechanicSpecializations = mechanic.specialization || [];

    // Debug logging
    console.log('🔍 === SPECIALIZATION DEBUG START ===');
    console.log('📋 Required Specialization:', requiredSpecialization);
    console.log('📋 Mechanic Specialization:', mechanicSpecializations);
    console.log('🔍 === SPECIALIZATION DEBUG END ===');

    // Handle case where specialization might be a string instead of array
    if (typeof mechanicSpecializations === 'string') {
      mechanicSpecializations = [mechanicSpecializations];
    }

    // Ensure it's an array
    if (!Array.isArray(mechanicSpecializations)) {
      mechanicSpecializations = [];
    }

    if (!requiredSpecialization) {
      console.log(`❌ No required specialization provided: "${requiredSpecialization}"`);
      return 0;
    }
    
    if (!mechanicSpecializations.length) {
      console.log(`❌ No mechanic specializations found: "${mechanicSpecializations}"`);
      return 0;
    }

    // Check for exact match first
    const exactMatch = mechanicSpecializations.some((spec: string) => 
      spec.toLowerCase().trim() === requiredSpecialization.toLowerCase().trim()
    );

    if (exactMatch) {
      console.log(`✅ Exact specialization match found: "${requiredSpecialization}" matches "${mechanicSpecializations}"`);
      return 1;
    }

    // Check for problem-specialization mapping
    const serviceTypeMatch = this.checkServiceTypeMapping(requiredSpecialization, mechanicSpecializations);
    if (serviceTypeMatch) {
      console.log(`✅ Service type mapping match found: "${requiredSpecialization}" -> "${mechanicSpecializations}"`);
      return 1;
    }

    // No match = 0
    console.log(`❌ No specialization match found:`, {
      mechanicId: mechanic.id || mechanic.user_id,
      mechanicName: mechanic.name,
      requiredSpecialization,
      mechanicSpecializations,
      score: 0
    });
    
    return 0;
  }

  /**
   * Check for specific service type mappings (e.g., dead battery -> electrical)
   * Enhanced to prioritize exact specialization matches for service types
   */
  private checkServiceTypeMapping(requiredSpecialization: string, mechanicSpecializations: string[]): boolean {
    const serviceMappings: { [key: string]: string[] } = {
      'dead battery': ['electrical', 'battery service', 'electrical system', 'electrical-systems'],
      'dead-battery': ['electrical', 'battery service', 'electrical system', 'electrical-systems'],
      'short circuit': ['electrical', 'electrical system', 'electrical-systems', 'wiring'],
      'short-circuit': ['electrical', 'electrical system', 'electrical-systems', 'wiring'],
      'non functional brake lights': ['electrical', 'lighting system', 'brake system', 'all-around', 'general repair'],
      'non-functional-brake-lights': ['electrical', 'lighting system', 'brake system', 'all-around', 'general repair'],
      'oil leak': ['engine and mechanical', 'oil system', 'engine repair'],
      'oil-leak': ['engine and mechanical', 'oil system', 'engine repair'],
      'overheating': ['engine and mechanical', 'cooling system', 'engine repair'],
      'tire assistance': ['general repair', 'tire service', 'wheel service', 'all-around'],
      'tire-assistance': ['general repair', 'tire service', 'wheel service', 'all-around'],
      'emergency fuel': ['general repair', 'fuel system', 'emergency service', 'all-around'],
      'emergency-fuel': ['general repair', 'fuel system', 'emergency service', 'all-around']
    };

    const requiredLower = requiredSpecialization.toLowerCase().trim();
    const validSpecializations = serviceMappings[requiredLower] || [];

    // Check for exact match in valid specializations
    const hasExactMatch = mechanicSpecializations.some((spec: string) => 
      validSpecializations.includes(spec.toLowerCase().trim())
    );

    if (hasExactMatch) {
      console.log(`✅ Service mapping match: "${requiredSpecialization}" -> "${mechanicSpecializations}" (valid: ${validSpecializations})`);
    }

    return hasExactMatch;
  }

  /**
   * Calculate rating score (0-1, higher is better)
   */
  private calculateRatingScore(mechanic: any): number {
    const rating = mechanic.rating || mechanic.average_rating || 0;
    const reviewCount = mechanic.review_count || mechanic.total_reviews || 0;

    // Base score from rating (0-5 scale)
    let score = rating / 5;

    // Bonus for having reviews (reliability factor)
    if (reviewCount > 0) {
      score += Math.min(reviewCount / 100, 0.2); // Max 0.2 bonus
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate availability score (0-1, higher is better)
   */
  private calculateAvailabilityScore(mechanic: any): number {
    const availability = mechanic.availability || mechanic.status;
    
    switch (availability?.toLowerCase()) {
      case 'available':
        return 1.0;
      case 'busy':
        return 0.5;
      case 'offline':
        return 0.0;
      default:
        return 0.0;
    }
  }

  /**
   * Calculate experience score (0-1, higher is better)
   */
  private calculateExperienceScore(mechanic: any): number {
    const experience = mechanic.experience_years || mechanic.years_experience || 0;
    
    // Score increases with experience, caps at 10 years
    return Math.min(experience / 10, 1.0);
  }

  /**
   * Calculate response time score (0-1, higher is better)
   */
  private calculateResponseTimeScore(mechanic: any): number {
    const avgResponseTime = mechanic.avg_response_time || mechanic.response_time || 30; // minutes
    
    // Lower response time = higher score
    if (avgResponseTime <= 15) return 1.0;
    if (avgResponseTime <= 30) return 0.8;
    if (avgResponseTime <= 60) return 0.6;
    if (avgResponseTime <= 120) return 0.4;
    return 0.2;
  }

  /**
   * Get service specialization details
   */
  private getServiceSpecialization(serviceType: string): ServiceSpecialization | null {
    // Try exact match first
    if (this.SERVICE_SPECIALIZATIONS[serviceType.toLowerCase()]) {
      return this.SERVICE_SPECIALIZATIONS[serviceType.toLowerCase()];
    }

    // Try partial match
    for (const [key, spec] of Object.entries(this.SERVICE_SPECIALIZATIONS)) {
      if (serviceType.toLowerCase().includes(key) || 
          spec.serviceType.toLowerCase().includes(serviceType.toLowerCase())) {
        return spec;
      }
    }

    return null;
  }

  /**
   * Get default weights for scoring criteria
   */
  getDefaultWeights(): { [key: string]: number } {
    const weights: { [key: string]: number } = {};
    this.DEFAULT_CRITERIA.forEach(criteria => {
      weights[criteria.name] = criteria.weight;
    });
    return weights;
  }

  /**
   * Get all available scoring criteria
   */
  getScoringCriteria(): ScoringCriteria[] {
    return [...this.DEFAULT_CRITERIA];
  }

  /**
   * Get service specializations mapping
   */
  getServiceSpecializations(): { [key: string]: ServiceSpecialization } {
    return { ...this.SERVICE_SPECIALIZATIONS };
  }

  /**
   * Sort mechanics by score
   */
  sortMechanicsByScore(mechanics: any[], booking: any): MechanicScore[] {
    return mechanics
      .map(mechanic => this.calculateMechanicScore(mechanic, booking))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Get top N mechanics by score
   */
  getTopMechanics(mechanics: any[], booking: any, limit: number = 5): MechanicScore[] {
    return this.sortMechanicsByScore(mechanics, booking).slice(0, limit);
  }

  /**
   * Validate scoring weights (must sum to 1.0)
   */
  validateWeights(weights: { [key: string]: number }): boolean {
    const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
    return Math.abs(sum - 1.0) < 0.01; // Allow small floating point errors
  }

  /**
   * Normalize weights to sum to 1.0
   */
  normalizeWeights(weights: { [key: string]: number }): { [key: string]: number } {
    const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
    const normalized: { [key: string]: number } = {};
    
    Object.entries(weights).forEach(([key, weight]) => {
      normalized[key] = weight / sum;
    });
    
    return normalized;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Test method to validate scoring with sample data
   */
  testScoringWithSampleData(): void {
    console.log('🧪 Testing Multi-Criteria Scoring with Sample Data');
    
    const sampleMechanic = {
      id: 'test-mechanic-1',
      user_id: 'test-mechanic-1',
      name: 'Test Mechanic',
      specialization: ['general repair', 'electrical'],
      latitude: 14.5995,
      longitude: 120.9842,
      distance: 2.5,
      availability: 'available',
      rating: 4.5
    };
    
    const sampleBooking = {
      required_specialization: 'general repair',
      client_latitude: 14.6042,
      client_longitude: 120.9822
    };
    
    const result = this.calculateMechanicScore(sampleMechanic, sampleBooking);
    
    console.log('🧪 Test Result:', result);
    console.log('🧪 Expected: distance score should be > 0, specialization score should be 1.0');
  }

  /**
   * Test the specific scenario: 2 mechanics at same distance, one general, one electrical, for short circuit
   */
  testShortCircuitScenario(): void {
    console.log('🧪 Testing Short Circuit Scenario: 2 mechanics at same distance');
    
    // Mechanic 1: General Mechanic
    const generalMechanic = {
      id: 'general-mechanic-1',
      user_id: 'general-mechanic-1',
      name: 'General Mechanic',
      specialization: ['general repair'],
      latitude: 14.5995,
      longitude: 120.9842,
      distance: 0, // Same distance as electrical mechanic
      availability: 'available',
      rating: 4.5
    };
    
    // Mechanic 2: Electrical Mechanic
    const electricalMechanic = {
      id: 'electrical-mechanic-1',
      user_id: 'electrical-mechanic-1',
      name: 'Electrical Mechanic',
      specialization: ['electrical'],
      latitude: 14.5995,
      longitude: 120.9842,
      distance: 0, // Same distance as general mechanic
      availability: 'available',
      rating: 4.5
    };
    
    // Booking for short circuit
    const shortCircuitBooking = {
      required_specialization: 'short circuit',
      client_latitude: 14.5995,
      client_longitude: 120.9842
    };
    
    // Calculate scores for both mechanics
    const generalScore = this.calculateMechanicScore(generalMechanic, shortCircuitBooking);
    const electricalScore = this.calculateMechanicScore(electricalMechanic, shortCircuitBooking);
    
    console.log('🧪 === SHORT CIRCUIT SCENARIO TEST ===');
    console.log('📋 General Mechanic Score:', generalScore);
    console.log('📋 Electrical Mechanic Score:', electricalScore);
    console.log('📋 Expected: Electrical mechanic should have higher score (2.0 vs 1.0)');
    console.log('📋 Distance Score: Both should be 1.0 (distance = 0)');
    console.log('📋 Specialization Score: General = 0, Electrical = 1');
    console.log('📋 Total Score: General = 1.0, Electrical = 2.0');
    
    // Verify the expected behavior
    const electricalWins = electricalScore.totalScore > generalScore.totalScore;
    console.log(`✅ Electrical mechanic wins: ${electricalWins}`);
    
    if (electricalWins) {
      console.log('🎉 SUCCESS: Electrical mechanic correctly selected for short circuit!');
    } else {
      console.log('❌ FAILURE: General mechanic was selected instead of electrical mechanic');
    }
  }
}
