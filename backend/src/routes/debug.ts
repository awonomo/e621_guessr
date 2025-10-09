import { Router } from 'express';
import { config } from '../config/database.js';
import ScoringService from '../services/ScoringService.js';
import db from '../database/connection.js';

const router = Router();

/**
 * Analyze tag distribution to help determine optimal histogram bins
 */
router.get('/tag-analysis/:category?', async (req, res) => {
  try {
    const category = req.params.category ? parseInt(req.params.category) : null;
    
    // Basic stats
    const basicStatsQuery = category !== null 
      ? 'SELECT MIN(post_count) as min_posts, MAX(post_count) as max_posts, COUNT(*) as total_tags, AVG(post_count) as avg_posts FROM tags WHERE category = $1'
      : 'SELECT MIN(post_count) as min_posts, MAX(post_count) as max_posts, COUNT(*) as total_tags, AVG(post_count) as avg_posts FROM tags';
    
    const basicStats = category !== null 
      ? await db.query(basicStatsQuery, [category])
      : await db.query(basicStatsQuery);

    // Percentile analysis
    const percentileQuery = category !== null
      ? 'SELECT percentile_cont(0.50) WITHIN GROUP (ORDER BY post_count) as p50, percentile_cont(0.75) WITHIN GROUP (ORDER BY post_count) as p75, percentile_cont(0.90) WITHIN GROUP (ORDER BY post_count) as p90, percentile_cont(0.95) WITHIN GROUP (ORDER BY post_count) as p95, percentile_cont(0.99) WITHIN GROUP (ORDER BY post_count) as p99 FROM tags WHERE category = $1'
      : 'SELECT percentile_cont(0.50) WITHIN GROUP (ORDER BY post_count) as p50, percentile_cont(0.75) WITHIN GROUP (ORDER BY post_count) as p75, percentile_cont(0.90) WITHIN GROUP (ORDER BY post_count) as p90, percentile_cont(0.95) WITHIN GROUP (ORDER BY post_count) as p95, percentile_cont(0.99) WITHIN GROUP (ORDER BY post_count) as p99 FROM tags';

    const percentiles = category !== null
      ? await db.query(percentileQuery, [category])
      : await db.query(percentileQuery);

    // Power-of-10 distribution
    const powerDistQuery = category !== null
      ? `SELECT 
          CASE 
            WHEN post_count = 1 THEN '1'
            WHEN post_count BETWEEN 2 AND 9 THEN '2-9'
            WHEN post_count BETWEEN 10 AND 31 THEN '10-31'
            WHEN post_count BETWEEN 32 AND 99 THEN '32-99'
            WHEN post_count BETWEEN 100 AND 316 THEN '100-316'
            WHEN post_count BETWEEN 317 AND 999 THEN '317-999'
            WHEN post_count BETWEEN 1000 AND 3162 THEN '1K-3K'
            WHEN post_count BETWEEN 3163 AND 9999 THEN '3K-10K'
            WHEN post_count BETWEEN 10000 AND 31622 THEN '10K-32K'
            WHEN post_count BETWEEN 31623 AND 99999 THEN '32K-100K'
            WHEN post_count BETWEEN 100000 AND 316227 THEN '100K-316K'
            WHEN post_count BETWEEN 316228 AND 999999 THEN '316K-1M'
            ELSE '1M+'
          END as range,
          COUNT(*) as tag_count
        FROM tags WHERE category = $1
        GROUP BY range
        ORDER BY MIN(post_count)`
      : `SELECT 
          CASE 
            WHEN post_count = 1 THEN '1'
            WHEN post_count BETWEEN 2 AND 9 THEN '2-9'
            WHEN post_count BETWEEN 10 AND 31 THEN '10-31'
            WHEN post_count BETWEEN 32 AND 99 THEN '32-99'
            WHEN post_count BETWEEN 100 AND 316 THEN '100-316'
            WHEN post_count BETWEEN 317 AND 999 THEN '317-999'
            WHEN post_count BETWEEN 1000 AND 3162 THEN '1K-3K'
            WHEN post_count BETWEEN 3163 AND 9999 THEN '3K-10K'
            WHEN post_count BETWEEN 10000 AND 31622 THEN '10K-32K'
            WHEN post_count BETWEEN 31623 AND 99999 THEN '32K-100K'
            WHEN post_count BETWEEN 100000 AND 316227 THEN '100K-316K'
            WHEN post_count BETWEEN 316228 AND 999999 THEN '316K-1M'
            ELSE '1M+'
          END as range,
          COUNT(*) as tag_count
        FROM tags 
        GROUP BY range
        ORDER BY MIN(post_count)`;;

    const powerDist = category !== null
      ? await db.query(powerDistQuery, [category])
      : await db.query(powerDistQuery);

    res.json({
      category: category,
      categoryName: category !== null ? getCategoryName(category) : 'All Categories',
      basicStats: basicStats.rows[0],
      percentiles: percentiles.rows[0],
      powerDistribution: powerDist.rows
    });

  } catch (error) {
    console.error('Tag analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze tag distribution' });
  }
});

/**
 * Enhanced comparison endpoint with both scoring curves and distributions
 */
router.get('/comparison-with-distributions', async (req, res) => {
  try {
    const result: any = {};
    
    // Get scoring curves and distributions for all 9 categories
    for (let category = 0; category <= 8; category++) {
      const categoryName = getCategoryName(category);
      
      // Get scoring curve data
      const scoringData = [];
      for (let i = 0; i <= 50; i++) {
        const postCount = Math.round(Math.pow(10, i / 10));
        const scoring = ScoringService.getDetailedScoring(postCount, category);
        scoringData.push({
          postCount,
          rarityScore: scoring.rarityScore,
          finalScore: scoring.finalScore
        });
      }
      
      // Get distribution data
      const distributionQuery = `SELECT 
        CASE 
          WHEN post_count = 1 THEN 1
          WHEN post_count BETWEEN 2 AND 9 THEN 5
          WHEN post_count BETWEEN 10 AND 31 THEN 20
          WHEN post_count BETWEEN 32 AND 99 THEN 65
          WHEN post_count BETWEEN 100 AND 316 THEN 200
          WHEN post_count BETWEEN 317 AND 999 THEN 650
          WHEN post_count BETWEEN 1000 AND 3162 THEN 2000
          WHEN post_count BETWEEN 3163 AND 9999 THEN 6500
          WHEN post_count BETWEEN 10000 AND 31622 THEN 20000
          WHEN post_count BETWEEN 31623 AND 99999 THEN 65000
          WHEN post_count BETWEEN 100000 AND 316227 THEN 200000
          WHEN post_count BETWEEN 316228 AND 999999 THEN 650000
          ELSE 2000000
        END as bin_center,
        CASE 
          WHEN post_count = 1 THEN '1'
          WHEN post_count BETWEEN 2 AND 9 THEN '2-9'
          WHEN post_count BETWEEN 10 AND 31 THEN '10-31'
          WHEN post_count BETWEEN 32 AND 99 THEN '32-99'
          WHEN post_count BETWEEN 100 AND 316 THEN '100-316'
          WHEN post_count BETWEEN 317 AND 999 THEN '317-999'
          WHEN post_count BETWEEN 1000 AND 3162 THEN '1K-3K'
          WHEN post_count BETWEEN 3163 AND 9999 THEN '3K-10K'
          WHEN post_count BETWEEN 10000 AND 31622 THEN '10K-32K'
          WHEN post_count BETWEEN 31623 AND 99999 THEN '32K-100K'
          WHEN post_count BETWEEN 100000 AND 316227 THEN '100K-316K'
          WHEN post_count BETWEEN 316228 AND 999999 THEN '316K-1M'
          ELSE '1M+'
        END as bin_label,
        COUNT(*) as tag_count
      FROM tags WHERE category = $1
      GROUP BY bin_center, bin_label,
        CASE 
          WHEN post_count = 1 THEN 1
          WHEN post_count BETWEEN 2 AND 9 THEN 2
          WHEN post_count BETWEEN 10 AND 31 THEN 3
          WHEN post_count BETWEEN 32 AND 99 THEN 4
          WHEN post_count BETWEEN 100 AND 316 THEN 5
          WHEN post_count BETWEEN 317 AND 999 THEN 6
          WHEN post_count BETWEEN 1000 AND 3162 THEN 7
          WHEN post_count BETWEEN 3163 AND 9999 THEN 8
          WHEN post_count BETWEEN 10000 AND 31622 THEN 9
          WHEN post_count BETWEEN 31623 AND 99999 THEN 10
          WHEN post_count BETWEEN 100000 AND 316227 THEN 11
          WHEN post_count BETWEEN 316228 AND 999999 THEN 12
          ELSE 13
        END
      ORDER BY bin_center`;
      
      const distribution = await db.query(distributionQuery, [category]);
      
      // Get sweet spot parameters
      const params = ScoringService.getDetailedScoring(1, category).parameters;
      
      result[category] = {
        name: categoryName,
        mu: params.mu,
        sigma: params.sigma,
        categoryWeight: params.categoryWeight,
        sweetSpotPosts: Math.pow(10, params.mu),
        scoringCurve: scoringData,
        distribution: distribution.rows
      };
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Comparison with distributions error:', error);
    res.status(500).json({ error: 'Failed to get comparison data' });
  }
});

/**
 * Tag distribution histogram endpoint
 */
router.get('/tag-distribution/:category?', async (req, res) => {
  try {
    const category = req.params.category ? parseInt(req.params.category) : null;
    
    // Get detailed distribution using logarithmic bins
    const distributionQuery = category !== null
      ? `SELECT 
          CASE 
            WHEN post_count = 1 THEN 1
            WHEN post_count BETWEEN 2 AND 9 THEN 5
            WHEN post_count BETWEEN 10 AND 31 THEN 20
            WHEN post_count BETWEEN 32 AND 99 THEN 65
            WHEN post_count BETWEEN 100 AND 316 THEN 200
            WHEN post_count BETWEEN 317 AND 999 THEN 650
            WHEN post_count BETWEEN 1000 AND 3162 THEN 2000
            WHEN post_count BETWEEN 3163 AND 9999 THEN 6500
            WHEN post_count BETWEEN 10000 AND 31622 THEN 20000
            WHEN post_count BETWEEN 31623 AND 99999 THEN 65000
            WHEN post_count BETWEEN 100000 AND 316227 THEN 200000
            WHEN post_count BETWEEN 316228 AND 999999 THEN 650000
            ELSE 2000000
          END as bin_center,
          CASE 
            WHEN post_count = 1 THEN '1'
            WHEN post_count BETWEEN 2 AND 9 THEN '2-9'
            WHEN post_count BETWEEN 10 AND 31 THEN '10-31'
            WHEN post_count BETWEEN 32 AND 99 THEN '32-99'
            WHEN post_count BETWEEN 100 AND 316 THEN '100-316'
            WHEN post_count BETWEEN 317 AND 999 THEN '317-999'
            WHEN post_count BETWEEN 1000 AND 3162 THEN '1K-3K'
            WHEN post_count BETWEEN 3163 AND 9999 THEN '3K-10K'
            WHEN post_count BETWEEN 10000 AND 31622 THEN '10K-32K'
            WHEN post_count BETWEEN 31623 AND 99999 THEN '32K-100K'
            WHEN post_count BETWEEN 100000 AND 316227 THEN '100K-316K'
            WHEN post_count BETWEEN 316228 AND 999999 THEN '316K-1M'
            ELSE '1M+'
          END as bin_label,
          COUNT(*) as tag_count,
          MIN(post_count) as bin_min,
          MAX(post_count) as bin_max
        FROM tags WHERE category = $1
        GROUP BY bin_center, bin_label, 
          CASE 
            WHEN post_count = 1 THEN 1
            WHEN post_count BETWEEN 2 AND 9 THEN 2
            WHEN post_count BETWEEN 10 AND 31 THEN 3
            WHEN post_count BETWEEN 32 AND 99 THEN 4
            WHEN post_count BETWEEN 100 AND 316 THEN 5
            WHEN post_count BETWEEN 317 AND 999 THEN 6
            WHEN post_count BETWEEN 1000 AND 3162 THEN 7
            WHEN post_count BETWEEN 3163 AND 9999 THEN 8
            WHEN post_count BETWEEN 10000 AND 31622 THEN 9
            WHEN post_count BETWEEN 31623 AND 99999 THEN 10
            WHEN post_count BETWEEN 100000 AND 316227 THEN 11
            WHEN post_count BETWEEN 316228 AND 999999 THEN 12
            ELSE 13
          END
        ORDER BY bin_center`
      : `SELECT 
          CASE 
            WHEN post_count = 1 THEN 1
            WHEN post_count BETWEEN 2 AND 9 THEN 5
            WHEN post_count BETWEEN 10 AND 31 THEN 20
            WHEN post_count BETWEEN 32 AND 99 THEN 65
            WHEN post_count BETWEEN 100 AND 316 THEN 200
            WHEN post_count BETWEEN 317 AND 999 THEN 650
            WHEN post_count BETWEEN 1000 AND 3162 THEN 2000
            WHEN post_count BETWEEN 3163 AND 9999 THEN 6500
            WHEN post_count BETWEEN 10000 AND 31622 THEN 20000
            WHEN post_count BETWEEN 31623 AND 99999 THEN 65000
            WHEN post_count BETWEEN 100000 AND 316227 THEN 200000
            WHEN post_count BETWEEN 316228 AND 999999 THEN 650000
            ELSE 2000000
          END as bin_center,
          CASE 
            WHEN post_count = 1 THEN '1'
            WHEN post_count BETWEEN 2 AND 9 THEN '2-9'
            WHEN post_count BETWEEN 10 AND 31 THEN '10-31'
            WHEN post_count BETWEEN 32 AND 99 THEN '32-99'
            WHEN post_count BETWEEN 100 AND 316 THEN '100-316'
            WHEN post_count BETWEEN 317 AND 999 THEN '317-999'
            WHEN post_count BETWEEN 1000 AND 3162 THEN '1K-3K'
            WHEN post_count BETWEEN 3163 AND 9999 THEN '3K-10K'
            WHEN post_count BETWEEN 10000 AND 31622 THEN '10K-32K'
            WHEN post_count BETWEEN 31623 AND 99999 THEN '32K-100K'
            WHEN post_count BETWEEN 100000 AND 316227 THEN '100K-316K'
            WHEN post_count BETWEEN 316228 AND 999999 THEN '316K-1M'
            ELSE '1M+'
          END as bin_label,
          COUNT(*) as tag_count,
          MIN(post_count) as bin_min,
          MAX(post_count) as bin_max
        FROM tags 
        GROUP BY bin_center, bin_label,
          CASE 
            WHEN post_count = 1 THEN 1
            WHEN post_count BETWEEN 2 AND 9 THEN 2
            WHEN post_count BETWEEN 10 AND 31 THEN 3
            WHEN post_count BETWEEN 32 AND 99 THEN 4
            WHEN post_count BETWEEN 100 AND 316 THEN 5
            WHEN post_count BETWEEN 317 AND 999 THEN 6
            WHEN post_count BETWEEN 1000 AND 3162 THEN 7
            WHEN post_count BETWEEN 3163 AND 9999 THEN 8
            WHEN post_count BETWEEN 10000 AND 31622 THEN 9
            WHEN post_count BETWEEN 31623 AND 99999 THEN 10
            WHEN post_count BETWEEN 100000 AND 316227 THEN 11
            WHEN post_count BETWEEN 316228 AND 999999 THEN 12
            ELSE 13
          END
        ORDER BY bin_center`;

    const distribution = category !== null
      ? await db.query(distributionQuery, [category])
      : await db.query(distributionQuery);

    // Get scoring curve data for overlay
    const scoringData = [];
    for (let i = 0; i <= 50; i++) {
      const postCount = Math.round(Math.pow(10, i / 10)); // 1 to 10,000,000
      const scoring = ScoringService.getDetailedScoring(postCount, category || 0);
      scoringData.push({
        postCount,
        rarityScore: scoring.rarityScore,
        finalScore: scoring.finalScore
      });
    }

    res.json({
      category: category,
      categoryName: category !== null ? getCategoryName(category) : 'All Categories',
      distribution: distribution.rows,
      scoringCurve: scoringData,
      sweetSpot: category !== null ? {
        mu: scoringData[0] ? ScoringService.getDetailedScoring(1, category).parameters.mu : 2.5,
        sigma: scoringData[0] ? ScoringService.getDetailedScoring(1, category).parameters.sigma : 0.8,
        targetPosts: Math.pow(10, scoringData[0] ? ScoringService.getDetailedScoring(1, category).parameters.mu : 2.5)
      } : null
    });

  } catch (error) {
    console.error('Tag distribution error:', error);
    res.status(500).json({ error: 'Failed to get tag distribution' });
  }
});

/**
 * Debug endpoint to visualize scoring transforms
 * Uses the actual ScoringService for accurate representation
 */
router.get('/scoring-curves/:category?', async (req, res) => {
  try {
    const category = parseInt(req.params.category || '0') || 0;

    // Generate data points for post counts from 1 to 1,000,000
    const dataPoints = [];
    
    // Use more points for smoother curves - logarithmic spacing
    for (let i = 0; i <= 100; i++) {
      const postCount = Math.round(Math.pow(10, i / 16.67)); // More granular: 1, 1.15, 1.32, ..., 1,000,000
      
      // Use the actual ScoringService to get detailed breakdown
      const scoringData = ScoringService.getDetailedScoring(postCount, category);
      
      dataPoints.push({
        postCount,
        logPostCount: Math.log10(Math.max(postCount, 1)),
        rarityScore: Math.round(scoringData.rarityScore * 1000) / 1000, // 3 decimal places
        baseScore: Math.round(scoringData.baseScore),
        finalScore: scoringData.finalScore
      });
    }

    res.json({
      category,
      categoryName: getCategoryName(category),
      parameters: dataPoints[0] ? ScoringService.getDetailedScoring(1, category).parameters : {},
      dataPoints,
      plotInstructions: {
        description: "Data generated using simplified single-stage scoring algorithm",
        xAxis: "postCount (or logPostCount for log scale)",
        yOptions: [
          "rarityScore - Single-stage bell curve with power scaling (0-1)",
          "baseScore - Score before category weight and multipliers",
          "finalScore - Final score with all multipliers applied"
        ]
      }
    });

  } catch (error) {
    console.error('Debug scoring curves error:', error);
    res.status(500).json({ error: 'Failed to generate scoring curves' });
  }
});

/**
 * Generate CSV format for easy import into Excel/Google Sheets
 */
router.get('/scoring-curves/:category/csv', async (req, res) => {
  try {
    const category = parseInt(req.params.category || '0') || 0;

    let csv = 'PostCount,LogPostCount,RarityScore,BaseScore,FinalScore\n';
    
    for (let i = 0; i <= 100; i++) {
      const postCount = Math.round(Math.pow(10, i / 16.67));
      const scoringData = ScoringService.getDetailedScoring(postCount, category);
      const x = Math.log10(Math.max(postCount, 1));
      
      csv += `${postCount},${x.toFixed(3)},${scoringData.rarityScore.toFixed(3)},${Math.round(scoringData.baseScore)},${scoringData.finalScore}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="scoring-curve-category-${category}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Debug CSV error:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

/**
 * Compare multiple categories side by side
 */
router.get('/scoring-comparison', async (req, res) => {
  try {
    const categories = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // All categories: General, Artist, Contributor, Copyright, Character, Species, Invalid, Meta, Lore
    const comparison: Record<number, any> = {};

    for (const category of categories) {
      const params = ScoringService.getDetailedScoring(1, category).parameters;

      comparison[category] = {
        name: getCategoryName(category),
        mu: params.mu,
        sigma: params.sigma, 
        categoryWeight: params.categoryWeight,
        samples: []
      };

      // Generate more data points for smoother curves (same as single category view)
      for (let i = 0; i <= 50; i++) { // Reduced from 100 for better performance
        const postCount = Math.round(Math.pow(10, i / 8.33)); // Logarithmic spacing from 1 to ~100,000
        const scoringData = ScoringService.getDetailedScoring(postCount, category);

        comparison[category].samples.push({
          postCount,
          finalScore: scoringData.finalScore
        });
      }
    }

    res.json(comparison);

  } catch (error) {
    console.error('Debug comparison error:', error);
    res.status(500).json({ error: 'Failed to generate comparison' });
  }
});

/**
 * Serve the visualization HTML directly from the backend
 */
router.get('/visualization', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>e6guessr - scoring visualizer</title>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js" 
            onerror="console.error('Failed to load Plotly'); document.getElementById('plotly-error').style.display='block';">
    </script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .controls { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
        select, button { padding: 8px 12px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; cursor: pointer; }
        button:hover { background: #0056b3; }
        .plot-container { margin: 20px 0; height: 500px; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .parameters { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
        .param-item { background: #f8f9fa; padding: 10px; border-radius: 4px; }
        .loading { text-align: center; color: #666; font-style: italic; }
        .algorithm-note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .status-bar { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; min-height: 40px; display: flex; align-items: center; justify-content: center; color: #495057; }
    </style>
</head>
<body>
    <div class="container">
        <h1>e6guessr - Scoring Visualizer</h1>
        
        <div id="plotly-error" style="display: none; background: #ffebee; color: #c62828; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <strong>Error:</strong> Failed to load Plotly library. Please check your internet connection and refresh the page.
        </div>

        <div class="controls">
            <label for="categorySelect">Category:</label>
            <select id="categorySelect">
                <option value="0">General</option>
                <option value="1">Artist</option>
                <option value="2">Contributor</option>
                <option value="3">Copyright</option>
                <option value="4">Character</option>
                <option value="5">Species</option>
                <option value="6">Invalid</option>
                <option value="7">Meta</option>
                <option value="8">Lore</option>
            </select>
            
            <button onclick="loadData()">Load Single Category</button>
            <button onclick="showComparison()" id="comparisonBtn">Compare All Categories</button>
            <button onclick="showDistribution()" id="distributionBtn">Show Tag Distribution</button>
            <button onclick="clearState()" style="background: #6c757d;">Reset View</button>
        </div>

        <div id="parameters" class="parameters" style="display: none;"></div>
        <div id="loading" class="loading" style="display: none;">Loading data...</div>
        <div id="transformPlot" class="plot-container"></div>
        <div id="scorePlot" class="plot-container"></div>
        <div id="comparisonPlot" class="plot-container"></div>
        <div id="distributionPlot" class="plot-container"></div>
        <div id="statusBar" class="status-bar">Hover over the charts to see detailed values</div>

                <div class="info">
            <h3>Simplified rarity curve</h3>
            <p>Modified Gaussian bell curve with built-in power scaling</p>
            <ul>
                <li><strong>Input:</strong> log₁₀(post_count) creates logarithmic distribution</li>
                <li><strong>Sweet Spot:</strong> μ (mu) parameter defines the optimal post count</li>
                <li><strong>Spread:</strong> σ (sigma) parameter controls curve width</li>
                <li><strong>Distribution:</strong> Power scaling (^0.4) spreads scores naturally</li>
            </ul>
        </div>

    </div>

    <script>
        const API_BASE = '/api/debug';
        let currentData = null;

        async function loadData() {
            const category = document.getElementById('categorySelect').value;
            document.getElementById('loading').style.display = 'block';
            document.getElementById('comparisonPlot').style.display = 'none';
            document.getElementById('distributionPlot').style.display = 'none';
            
            // Show the individual plots
            document.getElementById('transformPlot').style.display = 'block';
            document.getElementById('scorePlot').style.display = 'block';
            
            // Save state
            localStorage.setItem('scoringVizState', JSON.stringify({
                view: 'single',
                category: category
            }));
            
            try {
                console.log('Fetching data for category:', category);
                const response = await fetch(API_BASE + '/scoring-curves/' + category);
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                
                const data = await response.json();
                console.log('Received data:', data);
                currentData = data;
                
                if (!data.dataPoints || data.dataPoints.length === 0) {
                    throw new Error('No data points received');
                }
                
                displayParameters(data.parameters, data.categoryName);
                
                if (typeof Plotly !== 'undefined') {
                    plotTransforms(data);
                    plotScores(data);
                } else {
                    // Fallback: show data in table format
                    showDataTable(data);
                }
                
            } catch (error) {
                console.error('Error details:', error);
                alert('Error loading data: ' + error.message);
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }

        function displayParameters(params, categoryName) {
            const div = document.getElementById('parameters');
            div.style.display = 'grid';
            div.innerHTML = 
                '<div class="param-item"><strong>Category:</strong> ' + categoryName + '</div>' +
                '<div class="param-item"><strong>Sweet Spot (μ):</strong> ' + params.mu + '</div>' +
                '<div class="param-item"><strong>Spread (σ):</strong> ' + params.sigma + '</div>' +
                '<div class="param-item"><strong>Category Weight:</strong> ' + params.categoryWeight + '</div>' +
                '<div class="param-item"><strong>Score Range:</strong> ' + params.minPoints + ' - ' + params.maxPoints + '</div>';
        }

        function plotTransforms(data) {
            if (typeof Plotly === 'undefined') {
                alert('Plotly library not loaded. Please check your internet connection.');
                return;
            }

            const postCounts = data.dataPoints.map(p => p.postCount);
            const rarityScores = data.dataPoints.map(p => p.rarityScore);

            const trace1 = {
                x: postCounts,
                y: rarityScores,
                name: 'Rarity Curve (Single-Stage)',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#4ecdc4', width: 4, shape: 'spline', smoothing: 1.3 }
            };

            const layout = {
                title: 'Simplified Scoring Algorithm',
                xaxis: { title: 'Post Count', type: 'log', showgrid: true },
                yaxis: { title: 'Rarity Score (0-1)', showgrid: true },
                hovermode: 'x unified',
                showlegend: true
            };

            Plotly.newPlot('transformPlot', [trace1], layout);
        }

        function plotScores(data) {
            if (typeof Plotly === 'undefined') {
                alert('Plotly library not loaded. Please check your internet connection.');
                return;
            }

            const postCounts = data.dataPoints.map(p => p.postCount);
            const baseScores = data.dataPoints.map(p => p.baseScore);
            const finalScores = data.dataPoints.map(p => p.finalScore);

            const trace1 = {
                x: postCounts,
                y: baseScores,
                name: 'Base Score',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#45b7d1', width: 3, shape: 'spline', smoothing: 1.3 }
            };

            const trace2 = {
                x: postCounts,
                y: finalScores,
                name: 'Final Score (with multipliers)',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#96ceb4', width: 3, shape: 'spline', smoothing: 1.3 }
            };

            const layout = {
                title: 'Score Distribution',
                xaxis: { title: 'Post Count', type: 'log', showgrid: true },
                yaxis: { title: 'Score Points', showgrid: true },
                hovermode: 'x unified',
                showlegend: true
            };

            Plotly.newPlot('scorePlot', [trace1, trace2], layout);
        }

        function plotDistribution(data) {
            if (typeof Plotly === 'undefined') {
                alert('Plotly library not loaded. Please check your internet connection.');
                return;
            }

            // Prepare histogram data
            const binCenters = data.distribution.map(d => d.bin_center);
            const tagCounts = data.distribution.map(d => parseInt(d.tag_count));
            const binLabels = data.distribution.map(d => d.bin_label);

            // Prepare scoring curve overlay
            const scoringX = data.scoringCurve.map(d => d.postCount);
            const scoringY = data.scoringCurve.map(d => d.rarityScore * Math.max(...tagCounts) * 0.8); // Scale to fit

            // Sweet spot line
            const sweetSpotX = data.sweetSpot ? data.sweetSpot.targetPosts : null;

            const histogramTrace = {
                x: binCenters,
                y: tagCounts,
                type: 'bar',
                name: 'Tag Count Distribution',
                text: binLabels.map((label, i) => label + ': ' + tagCounts[i].toLocaleString() + ' tags'),
                textposition: 'outside',
                marker: { 
                    color: '#4ecdc4',
                    opacity: 0.7,
                    line: { color: '#2c8e87', width: 2 }
                },
                hovertemplate: '%{text}<br>Post Count Range: %{x}<extra></extra>'
            };

            const scoringTrace = {
                x: scoringX,
                y: scoringY,
                type: 'scatter',
                mode: 'lines',
                name: 'Scoring Curve (scaled)',
                line: { color: '#ff6b6b', width: 3 },
                yaxis: 'y2',
                hovertemplate: 'Post Count: %{x}<br>Rarity Score: %{customdata:.3f}<extra></extra>',
                customdata: data.scoringCurve.map(d => d.rarityScore)
            };

            const traces = [histogramTrace, scoringTrace];

            // Add sweet spot line if available
            if (sweetSpotX) {
                traces.push({
                    x: [sweetSpotX, sweetSpotX],
                    y: [0, Math.max(...tagCounts)],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Sweet Spot (μ=' + data.sweetSpot.mu + ')',
                    line: { color: '#e74c3c', width: 3, dash: 'dash' },
                    hovertemplate: 'Sweet Spot: %{x} posts<extra></extra>'
                });
            }

            const layout = {
                title: data.categoryName + ' - Tag Distribution vs Scoring Curve',
                xaxis: { 
                    title: 'Post Count', 
                    type: 'log',
                    showgrid: true,
                    tickvals: [1, 10, 100, 1000, 10000, 100000],
                    ticktext: ['1', '10', '100', '1K', '10K', '100K']
                },
                yaxis: { 
                    title: 'Number of Tags', 
                    showgrid: true,
                    side: 'left'
                },
                yaxis2: {
                    title: 'Rarity Score (scaled)',
                    overlaying: 'y',
                    side: 'right',
                    showgrid: false
                },
                hovermode: 'x unified',
                showlegend: true,
                barmode: 'overlay'
            };

            Plotly.newPlot('distributionPlot', traces, layout);
        }

        function plotComparisonWithDistributions(data) {
            if (typeof Plotly === 'undefined') {
                alert('Plotly library not loaded. Please check your internet connection.');
                return;
            }

            const traces = [];
            const colors = [
                '#ff6b6b', // Red - General
                '#4ecdc4', // Teal - Artist
                '#45b7d1', // Blue - Contributor
                '#96ceb4', // Green - Copyright
                '#ffeaa7', // Yellow - Character
                '#dda0dd', // Plum - Species
                '#ff9f43', // Orange - Invalid
                '#a29bfe', // Purple - Meta
                '#fd79a8'  // Pink - Lore
            ];

            // Find global max tag count for scaling
            let globalMaxTagCount = 0;
            for (const [category, info] of Object.entries(data)) {
                const maxInCategory = Math.max(...info.distribution.map(d => parseInt(d.tag_count)));
                globalMaxTagCount = Math.max(globalMaxTagCount, maxInCategory);
            }

            let colorIndex = 0;
            for (const [category, info] of Object.entries(data)) {
                const color = colors[colorIndex];
                
                // Distribution histogram
                const binCenters = info.distribution.map(d => d.bin_center);
                const tagCounts = info.distribution.map(d => parseInt(d.tag_count));
                const binLabels = info.distribution.map(d => d.bin_label);
                
                traces.push({
                    x: binCenters,
                    y: tagCounts,
                    type: 'bar',
                    name: info.name + ' Distribution',
                    text: binLabels.map((label, i) => label + ': ' + tagCounts[i].toLocaleString()),
                    textposition: 'none', // Hide text labels to reduce clutter
                    marker: { 
                        color: color,
                        opacity: 0.6,
                        line: { color: color, width: 1 }
                    },
                    hovertemplate: info.name + '<br>%{text} tags<br>Post Range: %{x}<extra></extra>',
                    legendgroup: info.name,
                    showlegend: true
                });

                // Scoring curve overlay
                const scoringX = info.scoringCurve.map(d => d.postCount);
                const scoringY = info.scoringCurve.map(d => d.rarityScore * globalMaxTagCount * 0.8); // Scale to fit
                
                traces.push({
                    x: scoringX,
                    y: scoringY,
                    type: 'scatter',
                    mode: 'lines',
                    name: info.name + ' Scoring',
                    line: { color: color, width: 3, dash: 'dash' },
                    yaxis: 'y2',
                    hovertemplate: info.name + '<br>Post Count: %{x}<br>Rarity Score: %{customdata:.3f}<extra></extra>',
                    customdata: info.scoringCurve.map(d => d.rarityScore),
                    legendgroup: info.name,
                    showlegend: false
                });

                // Sweet spot line
                traces.push({
                    x: [info.sweetSpotPosts, info.sweetSpotPosts],
                    y: [0, globalMaxTagCount],
                    type: 'scatter',
                    mode: 'lines',
                    name: info.name + ' Sweet Spot',
                    line: { color: color, width: 2, dash: 'dot' },
                    hovertemplate: info.name + ' Sweet Spot<br>μ=' + info.mu + ' (' + Math.round(info.sweetSpotPosts) + ' posts)<extra></extra>',
                    legendgroup: info.name,
                    showlegend: false
                });

                colorIndex++;
            }

            const layout = {
                title: 'All Categories - Tag Distributions vs Scoring Curves',
                xaxis: { 
                    title: 'Post Count', 
                    type: 'log',
                    showgrid: true,
                    tickvals: [1, 10, 100, 1000, 10000, 100000, 1000000],
                    ticktext: ['1', '10', '100', '1K', '10K', '100K', '1M']
                },
                yaxis: { 
                    title: 'Number of Tags', 
                    showgrid: true,
                    side: 'left'
                },
                yaxis2: {
                    title: 'Rarity Score (scaled)',
                    overlaying: 'y',
                    side: 'right',
                    showgrid: false
                },
                hovermode: 'closest',
                showlegend: true,
                barmode: 'overlay',
                legend: {
                    orientation: "h",
                    yanchor: "top",
                    y: -0.2,
                    xanchor: "center",
                    x: 0.5
                }
            };

            Plotly.newPlot('comparisonPlot', traces, layout);
        }

        function plotComparisonScores(data) {
            if (typeof Plotly === 'undefined') {
                alert('Plotly library not loaded. Please check your internet connection.');
                return;
            }

            const traces = [];
            const colors = [
                '#ff6b6b', // Red - General
                '#4ecdc4', // Teal - Artist
                '#45b7d1', // Blue - Contributor
                '#96ceb4', // Green - Copyright
                '#ffeaa7', // Yellow - Character
                '#dda0dd', // Plum - Species
                '#ff9f43', // Orange - Invalid
                '#a29bfe', // Purple - Meta
                '#fd79a8'  // Pink - Lore
            ];

            let colorIndex = 0;
            for (const [category, info] of Object.entries(data)) {
                const postCounts = info.scoringCurve.map(d => d.postCount);
                const finalScores = info.scoringCurve.map(d => d.finalScore);
                
                traces.push({
                    x: postCounts,
                    y: finalScores,
                    name: info.name + ' (μ=' + info.mu + ')',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: colors[colorIndex], width: 3, shape: 'spline', smoothing: 1.3 },
                    hovertemplate: info.name + '<br>Post Count: %{x}<br>Final Score: %{y}<extra></extra>'
                });

                // Add sweet spot marker
                const sweetSpotScore = info.scoringCurve.find(d => 
                    Math.abs(d.postCount - info.sweetSpotPosts) < info.sweetSpotPosts * 0.1
                );
                if (sweetSpotScore) {
                    traces.push({
                        x: [info.sweetSpotPosts],
                        y: [sweetSpotScore.finalScore],
                        name: info.name + ' Sweet Spot',
                        type: 'scatter',
                        mode: 'markers',
                        marker: { 
                            color: colors[colorIndex], 
                            size: 12, 
                            symbol: 'diamond',
                            line: { color: 'white', width: 2 }
                        },
                        hovertemplate: info.name + ' Sweet Spot<br>μ=' + info.mu + ' (' + Math.round(info.sweetSpotPosts) + ' posts)<br>Score: %{y}<extra></extra>',
                        showlegend: false
                    });
                }

                colorIndex++;
            }

            const layout = {
                title: 'All Categories - Final Score Comparison',
                xaxis: { 
                    title: 'Post Count', 
                    type: 'log', 
                    showgrid: true,
                    tickvals: [1, 10, 100, 1000, 10000, 100000, 1000000],
                    ticktext: ['1', '10', '100', '1K', '10K', '100K', '1M']
                },
                yaxis: { 
                    title: 'Final Score Points', 
                    showgrid: true 
                },
                hovermode: 'x unified',
                showlegend: true,
                legend: {
                    orientation: "h",
                    yanchor: "top",
                    y: -0.15,
                    xanchor: "center",
                    x: 0.5
                }
            };

            Plotly.newPlot('scorePlot', traces, layout);
        }

        function showDataTable(data) {
            const tableHtml = 
                '<h3>Scoring Data (Plotly unavailable - showing raw data)</h3>' +
                '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 12px;">' +
                '<tr><th>Post Count</th><th>Rarity Score</th><th>Log Rarity Score</th><th>Base Score</th><th>Final Score</th></tr>' +
                data.dataPoints.slice(0, 20).map(p => 
                    '<tr><td>' + p.postCount + '</td><td>' + p.rarityScore + '</td><td>' + p.logRarityScore + '</td><td>' + p.baseScore + '</td><td>' + p.finalScore + '</td></tr>'
                ).join('') +
                '</table>' +
                '<p><em>Showing first 20 rows. Install Plotly for interactive charts.</em></p>';
            
            document.getElementById('transformPlot').innerHTML = tableHtml;
            document.getElementById('scorePlot').style.display = 'none';
        }

        async function showDistribution() {
            const category = document.getElementById('categorySelect').value;
            document.getElementById('loading').style.display = 'block';
            document.getElementById('transformPlot').style.display = 'none';
            document.getElementById('scorePlot').style.display = 'none';
            document.getElementById('comparisonPlot').style.display = 'none';
            document.getElementById('parameters').style.display = 'none';
            
            // Save state
            localStorage.setItem('scoringVizState', JSON.stringify({
                view: 'distribution',
                category: category
            }));
            
            try {
                console.log('Fetching distribution for category:', category);
                const response = await fetch(API_BASE + '/tag-distribution/' + category);
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                
                const data = await response.json();
                console.log('Received distribution data:', data);
                
                if (typeof Plotly !== 'undefined') {
                    plotDistribution(data);
                } else {
                    alert('Plotly library not loaded. Please check your internet connection.');
                }
                
                document.getElementById('distributionPlot').style.display = 'block';
                
            } catch (error) {
                console.error('Error loading distribution:', error);
                alert('Error loading distribution: ' + error.message);
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }

        async function showComparison() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('transformPlot').style.display = 'none';
            document.getElementById('scorePlot').style.display = 'none';
            document.getElementById('distributionPlot').style.display = 'none';
            document.getElementById('parameters').style.display = 'none';
            
            // Save state
            localStorage.setItem('scoringVizState', JSON.stringify({
                view: 'comparison'
            }));
            
            try {
                const response = await fetch(API_BASE + '/comparison-with-distributions');
                const data = await response.json();
                
                if (typeof Plotly !== 'undefined') {
                    plotComparisonWithDistributions(data);
                    plotComparisonScores(data);
                } else {
                    alert('Plotly library not loaded. Please check your internet connection.');
                }
                
                document.getElementById('comparisonPlot').style.display = 'block';
                document.getElementById('scorePlot').style.display = 'block';
                
            } catch (error) {
                console.error('Error loading comparison:', error);
                alert('Error loading comparison: ' + error.message);
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }

        function clearState() {
            localStorage.removeItem('scoringVizState');
            // Default to comparison view
            showComparison();
        }

        function restoreState() {
            const savedState = localStorage.getItem('scoringVizState');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    if (state.view === 'single' && state.category) {
                        document.getElementById('categorySelect').value = state.category;
                        loadData();
                    } else if (state.view === 'comparison') {
                        showComparison();
                    } else if (state.view === 'distribution' && state.category) {
                        document.getElementById('categorySelect').value = state.category;
                        showDistribution();
                    } else {
                        // Default to comparison view
                        showComparison();
                    }
                } catch (e) {
                    console.error('Error parsing saved state:', e);
                    showComparison();
                }
            } else {
                // Default to comparison view for new users
                showComparison();
            }
        }

        // Load default data on page load
        window.addEventListener('load', () => {
            // Wait for Plotly to load
            if (typeof Plotly === 'undefined') {
                console.log('Plotly not loaded yet, waiting...');
                setTimeout(() => {
                    if (typeof Plotly !== 'undefined') {
                        restoreState();
                    } else {
                        alert('Failed to load Plotly library. Check your internet connection.');
                    }
                }, 2000);
            } else {
                restoreState();
            }
        });
    </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.plot.ly; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; font-src 'self' data: https:");
  res.send(html);
});

function getCategoryName(category: number): string {
  const names: Record<number, string> = {
    0: 'General',
    1: 'Artist', 
    2: 'Contributor',
    3: 'Copyright',
    4: 'Character',
    5: 'Species',
    6: 'Invalid',
    7: 'Meta',
    8: 'Lore'
  };
  return names[category] || 'Unknown';
}

export default router;